/**
 * Közös alkalmazás-állapot: dashboardok + aktív dashboard + Homey kredenciálok.
 * Tárolás: localStorage (azonnali) + `/api/state` szerver (több eszköz közötti szinkron).
 *
 * A **megjelenítő** (panel) `hydrate()`-el tölt szerverről és `startPoll()`-al követi az
 * admin-változásokat élőben. Az **admin** ugyanezekbe a store-okba ír, a változás mentődik
 * (localStorage + szerver), a panel a következő poll-nál átveszi.
 *
 * Seed: első indításkor a régi statikus config (src/config/dashboard.js).
 */
import { writable, derived, get } from 'svelte/store'
import seed from '../config/dashboard.js'
import { getState, putState } from './sync.js'

const LS = 'appstate.v1'
const uid = () => Math.random().toString(36).slice(2, 9)

function withIds(dash) {
  return {
    id: dash.id ?? uid(),
    name: dash.name ?? 'Dashboard',
    // melyik oldallal induljon a panel; null = az első oldal. Oldal-ID-t
    // tárolunk, nem sorszámot: az oldalak átrendezése ne írja át a jelentését.
    startPageId: dash.startPageId ?? null,
    // hány másodperc tétlenség után térjen vissza a kezdőoldalra (0 = soha)
    idleReturnSec: dash.idleReturnSec ?? 0,
    // melyik panelre készült ez a dashboard (méret + rács)
    panel: dash.panel ?? { ...PANEL_DEF },
    pages: (dash.pages ?? []).map((p) => ({
      id: p.id ?? uid(),
      title: p.title ?? 'Oldal',
      widgets: (p.widgets ?? []).map((w) => ({ id: w.id ?? uid(), ...w })),
    })),
  }
}

const UI_DEF = { swipeFingers: 2 }
/* Időjárás: EGY hely az egész rendszernek (korábban dashboardonként volt).
   A régi mentésekből az aktív — vagy az első koordinátát hordozó — dashboard
   értékét vesszük át, hogy senkinek ne kelljen újra beírnia. */
const WEATHER_DEF = { lat: 47.4979, lon: 19.0402, days: 7, name: 'Budapest' }
const weatherOf = (s) =>
  s?.weather ??
  (s?.dashboards ?? []).find((d) => d.id === s?.activeId && d.weather)?.weather ??
  (s?.dashboards ?? []).find((d) => d.weather?.lat != null)?.weather ??
  WEATHER_DEF

/* ---------- Panel-profilok ----------
   A rajzolás KALIBRÁLT viewportban történik (index.html + App.svelte): a
   tervezési keret CSS-pixelben van, a panel böngészője skálázza a fizikai
   képernyőre. Ezért a cella mérete minden profilban ~107 px marad, csak az
   oszlop/sor-szám változik — így a widgetek belső méretei és mért küszöbei
   (betűk, 300/400px-es scene-küszöb stb.) változatlanul jók.

   Az eredeti (ESP32-es) NSPanel szándékosan hiányzik: azon nincs böngésző. */
export const PANEL_PRESETS = {
  pro86: { name: 'NSPanel Pro 86 / Gen2 — 480×480', w: 480, h: 480, cols: 4, rows: 4 },
  pro120: { name: 'NSPanel Pro 120 — álló', w: 480, h: 854, cols: 4, rows: 7 },
  pro120land: { name: 'NSPanel Pro 120 — fekvő', w: 854, h: 480, cols: 7, rows: 4 },
}
const PANEL_DEF = { preset: 'pro86', ...PANEL_PRESETS.pro86 }
/** Egy dashboard panel-profilja (hiányzó mezőkre a 480×480-as alap). */
export const panelOf = (dash) => {
  const p = dash?.panel ?? {}
  const base = PANEL_PRESETS[p.preset] ?? PANEL_PRESETS.pro86
  return {
    preset: p.preset ?? 'pro86',
    w: +p.w || base.w,
    h: +p.h || base.h,
    cols: Math.max(1, +p.cols || base.cols),
    rows: Math.max(1, +p.rows || base.rows),
  }
}
// MOHU hulladéknaptár címe (globális, mint a BKK API-kulcs). A `...Label` mezők
// csak a megjelenítéshez kellenek, hogy a beállítás listák betöltése nélkül is
// olvasható legyen, mi van kiválasztva.
// A `hiddenTypes` KIZÁRÁSOS lista: ami nincs benne, az látszik — így a MOHU-nál
// később megjelenő típus (pl. szezonális zöldhulladék) magától előjön.
const MOHU_DEF = { district: '', districtLabel: '', publicPlace: '', placeLabel: '', houseNumber: '', hiddenTypes: [] }

function loadInitial() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) || 'null')
    if (raw?.dashboards?.length) return raw
  } catch {}
  const d = withIds({ name: 'Otthon', ...seed })
  return { dashboards: [d], activeId: d.id, homey: { address: '', token: '' }, bkk: { apiKey: '' }, ui: UI_DEF, rev: 0 }
}

const initial = loadInitial()
export const dashboards = writable(initial.dashboards)
export const activeId = writable(initial.activeId)
export const homeyCreds = writable(initial.homey ?? { address: '', token: '' })
export const bkk = writable(initial.bkk ?? { apiKey: '' })
// Szemétszállítás (MOHU) címe — a widget ebből dolgozik.
export const mohu = writable({ ...MOHU_DEF, ...(initial.mohu ?? {}) })
// Kioszk-szintű UI beállítások (globális, dashboard-független).
//   swipeFingers: 2 = kétujjas lapozás (egy ujj a vezérlőké), 1 = egyujjas lapozás (régi mód)
export const ui = writable({ ...UI_DEF, ...(initial.ui ?? {}) })
/** Időjárás-hely (globális, dashboard-független). */
export const weather = writable({ ...WEATHER_DEF, ...weatherOf(initial) })

export const activeDashboard = derived([dashboards, activeId], ([$d, $id]) => $d.find((x) => x.id === $id) ?? $d[0])
/** Az aktív dashboard panel-profilja — a keret, a lapozó és a widgetek ebből méreteznek. */
export const panel = derived(activeDashboard, ($d) => panelOf($d))

/* ---------- Perzisztencia + szinkron ---------- */
let knownRev = initial.rev ?? 0
let applying = false
let ready = false // amíg nem hidratáltunk szerverről, nem írunk vissza (ne írjuk felül a szerver-állapotot)
let saveT

function snapshot(rev) {
  return {
    dashboards: get(dashboards),
    activeId: get(activeId),
    homey: get(homeyCreds),
    bkk: get(bkk),
    mohu: get(mohu),
    ui: get(ui),
    weather: get(weather),
    rev,
  }
}
async function save() {
  const rev = Date.now()
  knownRev = rev
  const state = snapshot(rev)
  try {
    localStorage.setItem(LS, JSON.stringify(state))
  } catch {}
  await putState(state)
}
function scheduleSave() {
  if (applying || !ready) return
  clearTimeout(saveT)
  saveT = setTimeout(save, 400)
}
dashboards.subscribe(scheduleSave)
activeId.subscribe(scheduleSave)
homeyCreds.subscribe(scheduleSave)
bkk.subscribe(scheduleSave)
mohu.subscribe(scheduleSave)
ui.subscribe(scheduleSave)
weather.subscribe(scheduleSave)

function applyState(s) {
  if (!s) return
  applying = true
  if (s.dashboards?.length)
    dashboards.set(
      s.dashboards.map(({ weather: _drop, ...d }) => ({
        startPageId: null,
        idleReturnSec: 0,
        panel: { ...PANEL_DEF },
        ...d,
      })),
    )
  if (s.activeId) activeId.set(s.activeId)
  if (s.homey) homeyCreds.set(s.homey)
  if (s.bkk) bkk.set(s.bkk)
  if (s.mohu) mohu.set({ ...MOHU_DEF, ...s.mohu })
  if (s.ui) ui.set({ ...UI_DEF, ...s.ui })
  weather.set({ ...WEATHER_DEF, ...weatherOf(s) })
  knownRev = s.rev ?? knownRev
  queueMicrotask(() => (applying = false))
}

/** Szerverről tölt (ha van), majd engedélyezi a visszaírást. Indításkor hívandó. */
export async function initSync() {
  const remote = await getState()
  if (remote && remote.rev && remote.rev !== knownRev) applyState(remote)
  ready = true
}

/** A megjelenítő élőben követi az admin-változásokat. */
export function startPoll(ms = 4000) {
  const id = setInterval(async () => {
    const remote = await getState()
    if (remote && remote.rev && remote.rev !== knownRev) applyState(remote)
  }, ms)
  return () => clearInterval(id)
}

/* ---------- Dashboard ---------- */
export function addDashboard(name = 'Új dashboard') {
  const d = withIds({ name, pages: [{ title: 'Oldal 1', widgets: [] }] })
  dashboards.update((a) => [...a, d])
  activeId.set(d.id)
  return d.id
}
export function removeDashboard(id) {
  dashboards.update((a) => (a.length > 1 ? a.filter((x) => x.id !== id) : a))
  const a = get(dashboards)
  if (!a.find((x) => x.id === get(activeId))) activeId.set(a[0]?.id)
}
export function renameDashboard(id, name) {
  dashboards.update((a) => a.map((x) => (x.id === id ? { ...x, name } : x)))
}
/** Melyik oldallal induljon a panel (null = első oldal). */
export function setStartPage(dashId, pageId) {
  dashboards.update((a) => a.map((d) => (d.id === dashId ? { ...d, startPageId: pageId || null } : d)))
}
/** Panel-profil (méret + rács). Preset váltásakor a preset értékei az irányadók. */
export function setPanel(dashId, patch) {
  dashboards.update((a) =>
    a.map((d) => {
      if (d.id !== dashId) return d
      const next = patch.preset && PANEL_PRESETS[patch.preset]
        ? { preset: patch.preset, ...PANEL_PRESETS[patch.preset] }
        : { ...panelOf(d), ...patch, preset: 'custom' }
      return { ...d, panel: next }
    }),
  )
}

/** Tétlenség után vissza a kezdőoldalra — másodpercben (0 = kikapcsolva). */
export function setIdleReturn(dashId, sec) {
  const v = Math.max(0, Math.round(+sec || 0))
  dashboards.update((a) => a.map((d) => (d.id === dashId ? { ...d, idleReturnSec: v } : d)))
}
/** Időjárás-hely módosítása (globális). */
export function setWeather(patch) {
  weather.update((w) => ({ ...w, ...patch }))
}

/* ---------- Page ---------- */
function updPage(dashId, pageId, fn) {
  dashboards.update((a) =>
    a.map((d) => (d.id === dashId ? { ...d, pages: d.pages.map((p) => (p.id === pageId ? fn(p) : p)) } : d)),
  )
}
export function addPage(dashId, title = 'Új oldal') {
  const pid = uid()
  dashboards.update((a) =>
    a.map((d) => (d.id === dashId ? { ...d, pages: [...d.pages, { id: pid, title, widgets: [] }] } : d)),
  )
  return pid
}
export function removePage(dashId, pageId) {
  dashboards.update((a) =>
    a.map((d) =>
      d.id === dashId
        ? {
            ...d,
            pages: d.pages.filter((p) => p.id !== pageId),
            // ha a kezdőoldalt töröltük, essen vissza az elsőre
            startPageId: d.startPageId === pageId ? null : d.startPageId,
          }
        : d,
    ),
  )
}
export function renamePage(dashId, pageId, title) {
  updPage(dashId, pageId, (p) => ({ ...p, title }))
}
export function reorderPage(dashId, from, to) {
  dashboards.update((a) =>
    a.map((d) => {
      if (d.id !== dashId) return d
      const pages = [...d.pages]
      if (from < 0 || from >= pages.length) return d
      const [m] = pages.splice(from, 1)
      pages.splice(Math.max(0, Math.min(pages.length, to)), 0, m)
      return { ...d, pages }
    }),
  )
}
export function movePage(dashId, pageId, dir) {
  dashboards.update((a) =>
    a.map((d) => {
      if (d.id !== dashId) return d
      const i = d.pages.findIndex((p) => p.id === pageId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= d.pages.length) return d
      const pages = [...d.pages]
      ;[pages[i], pages[j]] = [pages[j], pages[i]]
      return { ...d, pages }
    }),
  )
}

/* ---------- Widget ---------- */
export function addWidget(dashId, pageId, widget) {
  const w = { id: uid(), ...widget }
  updPage(dashId, pageId, (p) => ({ ...p, widgets: [...p.widgets, w] }))
  return w.id
}
export function updateWidget(dashId, pageId, widgetId, next) {
  updPage(dashId, pageId, (p) => ({
    ...p,
    widgets: p.widgets.map((w) => (w.id === widgetId ? { id: w.id, ...next } : w)),
  }))
}
export function removeWidget(dashId, pageId, widgetId) {
  updPage(dashId, pageId, (p) => ({ ...p, widgets: p.widgets.filter((w) => w.id !== widgetId) }))
}

/* ---------- Widget-méret korlátok ----------
   Alapból a panel rácsa a határ. Ami itt szerepel, annál nem lehet nagyobb: az
   infografika 3×3-nál nagyobb méretben nem hasznos (a csempék üresen tátonganak,
   és elfoglalja a teljes oldalt), a termosztát pedig fekvő csempe — a tárcsa a
   popupban van, tehát egy sornál magasabbra nincs szüksége (a szélessége viszont
   a panel rácsáig mehet, ezért ott nincs `w`).
   A szerkesztő átméretezése ezt tartja be; a MÁR kirakott, nagyobb widgetet a
   config-panel „Igazítás” gombja húzza vissza. */
export const MAX_SIZE = { info: { w: 3, h: 3 }, thermostat: { h: 1 } }
export const maxSizeOf = (type, p = PANEL_PRESETS.pro86) => {
  const lim = MAX_SIZE[type] ?? {}
  return { w: Math.min(lim.w ?? p.cols, p.cols), h: Math.min(lim.h ?? p.rows, p.rows) }
}

/* ---------- Widget-paletta (alap configok) ---------- */
export const PALETTE = [
  { type: 'weather', name: 'Időjárás', def: { size: { w: 4, h: 2 }, pos: { x: 1, y: 1 } } },
  {
    type: 'qr',
    name: 'QR-kód',
    def: {
      size: { w: 1, h: 1 },
      pos: { x: 1, y: 1 },
      label: 'Wi-Fi',
      icon: 'wifi',
      mode: 'wifi',
      wifi: { ssid: '', password: '', security: 'WPA', hidden: false },
    },
  },
  { type: 'thermostat', name: 'Termosztát', def: { size: { w: 4, h: 1 }, pos: { x: 1, y: 1 }, label: 'Termosztát' } },
  {
    type: 'sliderGroup',
    name: 'Csúszka-csoport',
    def: { size: { w: 4, h: 2 }, pos: { x: 1, y: 1 }, variant: 'light', items: [{ label: 'Fény', value: 60 }] },
  },
  { type: 'button', name: 'Gomb', def: { size: { w: 2, h: 1 }, pos: { x: 1, y: 1 }, label: 'Gomb', icon: 'power' } },
  {
    type: 'chart',
    name: 'Grafikon',
    def: { size: { w: 2, h: 2 }, pos: { x: 1, y: 1 }, chart: 'donut', data: { title: 'Grafikon', vals: [3, 2, 1], center: '6' } },
  },
  {
    type: 'mood',
    name: 'Mood-ok',
    def: { size: { w: 2, h: 2 }, pos: { x: 1, y: 1 }, label: 'Hangulatok', source: 'favorite', icon: 'mood' },
  },
  {
    type: 'bkk',
    name: 'BKK indulások',
    def: { size: { w: 2, h: 2 }, pos: { x: 1, y: 1 }, label: 'Indulások', routes: [] },
  },
  {
    type: 'mohu',
    name: 'Szemétszállítás',
    def: { size: { w: 2, h: 2 }, pos: { x: 1, y: 1 }, label: 'Szemétszállítás', showLabel: false },
  },
  {
    type: 'info',
    name: 'Infografika',
    def: { size: { w: 3, h: 2 }, pos: { x: 1, y: 1 }, label: 'Infografika', variant: 'grid', items: [] },
  },
]
