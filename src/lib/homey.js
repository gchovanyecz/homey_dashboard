/**
 * Homey kapcsolat — lokális Web API + Personal Access Token.
 * Dokumentáció: https://athombv.github.io/node-homey-api/
 *
 *   const api = await HomeyAPI.createLocalAPI({ address, token })
 *   const devices = await api.devices.getDevices()
 *   device.capabilitiesObj[cap].value           // aktuális érték
 *   device.setCapabilityValue({ capabilityId, value })
 *   device.makeCapabilityInstance(cap, cb)      // realtime frissítés
 *   api.flow.triggerFlow({ id })                // flow indítása
 */
import { get } from 'svelte/store'
import { connection, devices, flows, moods, zones, insightLogs } from './stores.js'
import { homeyCreds } from './dashboards.js'

// A homey-api (+ socket.io) nagy; csak csatlakozáskor töltjük be, hogy a
// kezdeti UI könnyű maradjon (gyenge panelen gyors első festés).

let api = null
let address = '' // az aktuális Homey cím (ikon-URL-ekhez, újrakapcsolódáshoz)
const capInstances = new Map() // `${deviceId}:${cap}` -> DeviceCapability instance
// MIT akarunk figyelni — a capInstances csak az ÉPP élő példányokat tartja.
// Újrakapcsolódás után ebből építjük vissza a feliratkozásokat.
const wanted = new Set() // `${deviceId}:${cap}`

/* ---------------------------------------------------------------------------
   Kapcsolat-őrzés (watchdog)

   A panel egy idő után "csatlakozva" állapotban ragadt, de nem kapott több
   eszköz-állapotot, és csak a lap újratöltése segített. Ok: a realtime socket
   némán elhal (a kioszk-böngésző felfüggeszti a WebSocketet alvó kijelzőnél,
   a szerver oldali zárást a fagyott timerek miatt a kliens nem veszi észre),
   a `connection.status` viszont 'connected' marad — a régi kód csak akkor
   próbált újrakapcsolódni, ha a státusz MÁR nem 'connected' volt, tehát soha.

   Ezért itt aktív ellenőrzés van:
   - 30 s-onként egy olcsó REST hívás (system.getInfo `$socket: false`-szal,
     ~80 ms) — ha hibázik, újrakapcsolódunk;
   - az api.isConnected() csak EGY irányban megbízható (mérve: a socket zárása
     után is true-t mond), ezért a false-t kezeljük hibaként — két egymást
     követő jelzés után —, a zombi socketre pedig a lenti eltérés-vizsgálat és
     a rendszeres újraolvasás felel;
   - a getInfo bootId-ja megmutatja, ha a Homey újraindult (ilyenkor a session
     és minden feliratkozás elveszett) → teljes újrakapcsolódás;
   - 2 percenként teljes érték-újraolvasás (getDevices, ~70 ms / 50 eszköz):
     ez a biztonsági háló, ettől a dashboard a socket nélkül is legfeljebb
     2 percet késik, nem fagy be véglegesen — a "semmi nem frissül újratöltésig"
     tünet innentől nem tud előfordulni;
   - ha az újraolvasás eltérést talál ÉS közben 2 percig egy realtime esemény
     sem jött, akkor a socket zombi → feliratkozások újraépítése.
--------------------------------------------------------------------------- */
const HEARTBEAT_MS = 30 * 1000
const FULL_REFRESH_MS = 2 * 60 * 1000
const QUIET_MS = 2 * 60 * 1000
const WRITE_GRACE_MS = 5 * 1000 // saját írás után ennyi ideig nem elemzünk eltérést

let watchdog = null
let bootId = null
let lastEventAt = 0 // utolsó realtime capability-esemény
let lastLocalWriteAt = 0 // utolsó setCapability
let lastFullRefreshAt = 0
let checking = false // egyszerre csak egy healthCheck
let socketDownStrikes = 0 // a socket lazán épül, ezért két jelzés kell a beavatkozáshoz
let connectPromise = null // egyszerre csak egy connect

// A kredenciálok a közös, szinkronizált állapotban élnek (homeyCreds store).
export function loadCreds() {
  const c = get(homeyCreds)
  return c?.address || c?.token ? c : null
}
export function saveCreds(c) {
  homeyCreds.set(c)
}
export function clearCreds() {
  homeyCreds.set({ address: '', token: '' })
}

function normAddress(addr) {
  let a = (addr || '').trim().replace(/\/+$/, '')
  if (a && !/^https?:\/\//i.test(a)) a = 'http://' + a
  return a
}

function capsOf(d) {
  const c = {}
  const obj = d.capabilitiesObj || {}
  for (const k in obj) c[k] = obj[k]?.value
  return c
}

// capability-metaadatok. A Homey maga adja a mértékegységet, tizedeseket és a
// szám-tartományt, az enumokhoz pedig a fordított címkéket — az infografika és
// a pickerek ezekből formáznak, hogy ne kelljen kézzel beírni semmit.
// { [id]: { type, setable, getable, title, units, min, max, decimals, values } }
function metaOf(d) {
  const m = {}
  const obj = d.capabilitiesObj || {}
  for (const k in obj) {
    const c = obj[k] || {}
    m[k] = {
      type: c.type,
      setable: c.setable,
      getable: c.getable,
      title: c.title,
      units: c.units ?? null,
      min: c.min ?? null,
      max: c.max ?? null,
      decimals: c.decimals ?? null,
      values: c.values,
    }
  }
  return m
}

// A Homey eszköz-ikon teljes URL-je (a Homey szolgálja ki lokálisan).
function iconUrlOf(d, address) {
  const u = d.iconObj?.url ?? (typeof d.icon === 'string' ? d.icon : null)
  if (!u || typeof u !== 'string') return null
  if (/^https?:\/\//i.test(u)) return u
  return address.replace(/\/+$/, '') + (u.startsWith('/') ? u : '/' + u)
}

/** Csatlakozás. Párhuzamos hívásoknál ugyanaz a promise jön vissza. */
export function connect(creds = loadCreds()) {
  if (connectPromise) return connectPromise
  connectPromise = doConnect(creds).finally(() => (connectPromise = null))
  return connectPromise
}

async function doConnect(creds = loadCreds()) {
  const addr = normAddress(creds?.address)
  const token = creds?.token?.trim()
  if (!addr || !token) {
    connection.set({ status: 'disconnected', error: null })
    return false
  }
  address = addr
  connection.set({ status: 'connecting', error: null })
  try {
    const { HomeyAPI } = await import('homey-api')
    api = await HomeyAPI.createLocalAPI({ address, token })
    wireApiEvents()
    const devs = await api.devices.getDevices()
    const map = {}
    for (const id in devs) {
      const d = devs[id]
      map[id] = { id, name: d.name, capabilities: capsOf(d), capsMeta: metaOf(d), iconUrl: iconUrlOf(d, address), _device: d }
    }
    devices.set(map)
    // flow-k (admin picker): a normál ÉS az Advanced Flow-k külön végponton élnek,
    // a Homey app/web is így listázza őket. Ha valamelyik nem elérhető, azt kihagyjuk.
    try {
      const [normal, advanced] = await Promise.all([
        api.flow.getFlows().catch((e) => (console.warn('[homey] getFlows failed', e), {})),
        api.flow.getAdvancedFlows?.().catch((e) => (console.warn('[homey] getAdvancedFlows failed', e), {})) ?? {},
      ])
      const norm = (x, adv) => ({
        id: x.id,
        name: x.name,
        advanced: adv,
        enabled: x.enabled !== false,
        folder: x.folder ?? null,
      })
      const list = [
        ...Object.values(normal ?? {}).map((x) => norm(x, false)),
        ...Object.values(advanced ?? {}).map((x) => norm(x, true)),
      ].sort((a, b) => a.name.localeCompare(b.name, 'hu'))
      flows.set(list)
      if (typeof window !== 'undefined') {
        window.homeyFlows = list // dev: flow-ID-k felderítése a konzolból
        console.info('[homey] %d flow (%d advanced)', list.length, list.filter((f) => f.advanced).length)
      }
    } catch (e) {
      console.warn('[homey] flow-lista betöltése sikertelen', e)
    }
    // mood-ok (hangulatok/jelenetek) + zónák
    try {
      const ms = await api.moods.getMoods()
      const raw = Object.values(ms)
      moods.set(
        raw.map((m) => ({
          id: m.id,
          name: m.name,
          zone: m.zone,
          favorite: !!(m.favorite ?? m.isFavorite ?? m.favourite),
          deviceCount: m.devices ? Object.keys(m.devices).length : 0,
          color: m.color ?? null,
        })),
      )
      if (typeof window !== 'undefined') window.homeyMoods = raw // dev: nyers mood-ok (favorite/szín mező ellenőrzéséhez)
    } catch {}
    try {
      const zs = await api.zones.getZones()
      zones.set(Object.values(zs).map((z) => ({ id: z.id, name: z.name, parent: z.parent })))
    } catch {}
    await loadInsightLogs(map)
    try {
      bootId = (await api.system.getInfo({ $socket: false }))?.bootId ?? null
    } catch {
      bootId = null
    }
    lastFullRefreshAt = Date.now()
    connection.set({ status: 'connected', error: null, lastSync: Date.now() })
    startWatchdog()
    // Fejlesztői segéd: eszköz-ID-k felderítése a böngésző konzolból.
    if (typeof window !== 'undefined') {
      window.homeyDevices = Object.values(map).map((d) => ({
        id: d.id,
        name: d.name,
        capabilities: Object.keys(d.capabilities),
      }))
      console.info('[homey] %d eszköz — lásd window.homeyDevices', window.homeyDevices.length)
    }
    return true
  } catch (e) {
    api = null
    connection.set({ status: 'error', error: String(e?.message || e) })
    return false
  }
}

export function disconnect() {
  stopWatchdog()
  killInstances()
  wanted.clear()
  api = null
  bootId = null
  devices.set({})
  moods.set([])
  zones.set([])
  insightLogs.set([])
  connection.set({ status: 'disconnected', error: null })
}

export function isConnected() {
  return get(connection).status === 'connected'
}

/** Feliratkozás egy capability realtime frissítéseire (idempotens). */
export function subscribe(deviceId, cap) {
  const key = `${deviceId}:${cap}`
  wanted.add(key) // akkor is megjegyezzük, ha most nincs kapcsolat
  makeInstance(key)
}

function makeInstance(key) {
  if (!api || capInstances.has(key)) return
  const i = key.lastIndexOf(':')
  const deviceId = key.slice(0, i)
  const cap = key.slice(i + 1)
  const dev = get(devices)[deviceId]?._device
  if (!dev) return
  try {
    const inst = dev.makeCapabilityInstance(cap, (value) => {
      lastEventAt = Date.now() // a socket él — ezt a watchdog is használja
      devices.update((m) => {
        const d = m[deviceId]
        if (d) d.capabilities = { ...d.capabilities, [cap]: value }
        return { ...m }
      })
    })
    capInstances.set(key, inst)
  } catch (e) {
    console.warn('[homey] subscribe failed', key, e)
  }
}

function killInstances() {
  for (const inst of capInstances.values()) {
    try {
      inst.destroy?.()
    } catch {}
  }
  capInstances.clear()
}

/** Feliratkozások újraépítése (a régi példányok a halott socketre hallgatnának). */
function resubscribeAll() {
  killInstances()
  for (const key of wanted) makeInstance(key)
  console.info('[homey] feliratkozások újraépítve (%d)', capInstances.size)
}

/* ---------- Kapcsolat-őrzés ---------- */

// A homey-api EventEmitter: a socket.io állapotváltásai itt jönnek ki.
// FONTOS: minden kezelő az ŐT LÉTREHOZÓ api-példányra szól. Egy eldobott
// példány socketje később még megjöhet `reconnect`-tel, és ha az a kezelő a
// mostani állapotra dolgozna, épp azt rontaná el, amit javítani akarunk
// (a tesztben így maradt 0 feliratkozás).
function wireApiEvents() {
  const self = api
  if (!self?.on) return
  const mine = () => api === self
  self.on('disconnect', (reason) => {
    if (!mine()) return
    console.warn('[homey] socket disconnect:', reason)
    // Nem 'error': a socket.io magától próbál visszakapcsolódni, a UI-nak
    // viszont látnia kell, hogy épp nincs élő adat. Adunk neki 20 s-ot a saját
    // visszakapcsolódásra, utána mi nézzük meg — így nem a következő 30 s-os
    // körre várunk.
    connection.update((c) => ({ ...c, status: 'connecting' }))
    setTimeout(() => mine() && healthCheck(), 20 * 1000)
  })
  self.on('reconnect', () => {
    if (!mine()) return
    console.info('[homey] socket reconnect → értékek + feliratkozások frissítése')
    connection.update((c) => ({ ...c, status: 'connected' }))
    // A kimaradás alatti változásokat egyetlen esemény sem hozza utólag,
    // ezért újraolvasunk, és a feliratkozásokat is újraépítjük.
    refreshValues()
      .then(() => mine() && resubscribeAll())
      .catch((e) => console.warn('[homey] reconnect utáni frissítés hibája', e?.message || e))
  })
  self.on('error', (e) => mine() && console.warn('[homey] socket error:', e?.message || e))
}

/** Minden eszköz értékének újraolvasása REST-en. A `_device` példányok maradnak. */
async function refreshValues() {
  if (!api) return { drift: 0 }
  // `$socket: false`: ez a hálónak a lényege, épp akkor kell működnie, amikor a
  // realtime csatorna nem — a socketen ez a hívás 10 s-ig lógott, majd elszállt.
  const devs = await api.devices.getDevices({ $socket: false })
  const graceful = Date.now() - lastLocalWriteAt < WRITE_GRACE_MS
  let drift = 0
  devices.update((m) => {
    const next = { ...m }
    for (const id in devs) {
      const d = devs[id]
      const caps = capsOf(d)
      const prev = next[id]
      if (!prev) {
        next[id] = { id, name: d.name, capabilities: caps, capsMeta: metaOf(d), iconUrl: iconUrlOf(d, address), _device: d }
        continue
      }
      if (!graceful) {
        for (const k in caps) {
          if (wanted.has(`${id}:${k}`) && prev.capabilities?.[k] !== caps[k]) drift++
        }
      }
      // csak az értékek frissülnek: a _device példányra élő feliratkozások hallgatnak
      next[id] = { ...prev, name: d.name, capabilities: caps }
    }
    for (const id in next) if (!devs[id]) delete next[id]
    return next
  })
  lastFullRefreshAt = Date.now()
  return { drift }
}

/** Teljes újrakapcsolódás: minden feliratkozás eldobása és újraépítése. */
async function hardReconnect(why) {
  console.warn('[homey] újrakapcsolódás:', why)
  stopWatchdog()
  killInstances()
  // Az eldobott példány listenereit is levesszük, hogy a késve megjövő
  // socket-események ne szóljanak bele az új kapcsolatba.
  try {
    api?.removeAllListeners?.()
  } catch {}
  api = null
  socketDownStrikes = 0
  connection.set({ status: 'connecting', error: null })
  const ok = await connect()
  if (ok) resubscribeAll()
  return ok
}

/**
 * Élet-ellenőrzés. A watchdog hívja 30 s-onként, illetve a UI, amikor a lap
 * újra előtérbe kerül vagy visszajön a hálózat (`force: true`).
 */
export async function healthCheck({ force = false } = {}) {
  if (checking) return
  checking = true
  try {
    await runHealthCheck(force)
  } catch (e) {
    // Ide nem szabad hibát kiengedni: a watchdog setIntervalja nem kapja el,
    // és a néma kimaradás pont a javítani kívánt tünetet hozná vissza.
    console.warn('[homey] healthCheck hiba:', e?.message || e)
    connection.update((c) => ({ ...(c ?? {}), status: 'connecting' }))
  } finally {
    checking = false
  }
}

async function runHealthCheck(force) {
  {
    const creds = loadCreds()
    if (!creds?.address || !creds?.token) return
    if (!api) return void (await hardReconnect('nincs API-példány'))

    // 1) REST elérhető-e (és nem indult-e újra a Homey)
    // `$socket: false` KELL: alapból a hívások a socketen mennek, és egy halott
    // socketen a próba 10 s-ot vár, mielőtt elbukik. Tiszta HTTP-n ~80 ms, és
    // akkor is válaszol, amikor a realtime csatorna már nem.
    let info
    try {
      info = await api.system.getInfo({ $socket: false })
    } catch (e) {
      return void (await hardReconnect('a REST hívás hibázott: ' + (e?.message || e)))
    }
    if (bootId && info?.bootId && info.bootId !== bootId) {
      return void (await hardReconnect('a Homey újraindult (bootId változott)'))
    }
    bootId = info?.bootId ?? bootId

    // 2) él-e a realtime socket
    //
    // Ez a jelzés csak EGY irányban megbízható: ha false, tényleg nincs socket.
    // Fordítva NEM — mérve is: a socket zárása után az isConnected() még
    // true-t mond (a névtér-socket "connected" marad), ezért a zombi esetre a
    // lentebbi eltérés-vizsgálat és a rendszeres újraolvasás felel.
    // Két csapdát kell még kerülni: (a) socket csak akkor épül, ha van legalább
    // egy capability-feliratkozás — a szerkesztőn a hiánya normális; (b) lazán
    // jön fel (a makeCapabilityInstance indítja), tehát indulás után
    // másodpercekig még nem él. Ezért két egymást követő jelzés kell.
    if (wanted.size > 0 && api.isConnected?.() !== true) {
      socketDownStrikes++
      if (socketDownStrikes >= 2) {
        return void (await hardReconnect(`a realtime socket ${socketDownStrikes} ellenőrzésen át nem élt`))
      }
      console.warn('[homey] a socket nem él (%d. jelzés) — várunk egy kört', socketDownStrikes)
      return
    }
    socketDownStrikes = 0

    connection.update((c) => ({ ...(c ?? {}), status: 'connected', error: null, lastSync: Date.now() }))

    // 3) időszakos teljes újraolvasás — ez a biztonsági háló
    if (force || Date.now() - lastFullRefreshAt > FULL_REFRESH_MS) {
      const { drift } = await refreshValues()
      // Zombi socket: a kapcsolat "él", de esemény nem jön, és közben az
      // értékek elmentek. Csak akkor lépünk, ha MINDKETTŐ igaz — a néma
      // időszak önmagában lehet egyszerűen csendes ház is.
      if (drift > 0 && Date.now() - lastEventAt > QUIET_MS) {
        console.warn('[homey] %d eltérés esemény nélkül → a socket zombi', drift)
        resubscribeAll()
      }
    }
  }
}

function startWatchdog() {
  stopWatchdog()
  if (typeof window === 'undefined') return
  watchdog = setInterval(() => healthCheck(), HEARTBEAT_MS)
  // Diagnosztika a böngésző konzoljából:
  //   homeyConn.info()       → mit lát a watchdog
  //   homeyConn.check()      → azonnali ellenőrzés + újraolvasás
  //   homeyConn.reconnect()  → kényszerített újrakapcsolódás
  window.homeyConn = {
    info: () => ({
      status: get(connection).status,
      socket: api?.isConnected?.() ?? false,
      subscriptions: capInstances.size,
      wanted: wanted.size,
      secsSinceEvent: lastEventAt ? Math.round((Date.now() - lastEventAt) / 1000) : null,
      secsSinceRefresh: Math.round((Date.now() - lastFullRefreshAt) / 1000),
      bootId,
    }),
    check: () => healthCheck({ force: true }),
    reconnect: () => hardReconnect('kézi kérés'),
    api: () => api,
  }
}
function stopWatchdog() {
  if (watchdog) clearInterval(watchdog)
  watchdog = null
}

/** Capability érték írása (optimista UI + tényleges hívás). */
export async function setCapability(deviceId, cap, value) {
  lastLocalWriteAt = Date.now()
  devices.update((m) => {
    const d = m[deviceId]
    if (d) d.capabilities = { ...d.capabilities, [cap]: value }
    return { ...m }
  })
  const dev = get(devices)[deviceId]?._device
  if (!dev) return
  try {
    await dev.setCapabilityValue({ capabilityId: cap, value })
  } catch (e) {
    console.error('[homey] setCapabilityValue failed', deviceId, cap, value, e)
  }
}

/** Mood (hangulat/jelenet) aktiválása. */
export async function setMood(id) {
  if (!api) return
  try {
    await api.moods.setMood({ id })
  } catch (e) {
    console.error('[homey] setMood failed', id, e)
  }
}

/** Flow indítása (normál vagy advanced). */
export async function triggerFlow(id, advanced = false) {
  if (!api) return
  try {
    if (advanced) await api.flow.triggerAdvancedFlow({ id })
    else await api.flow.triggerFlow({ id })
  } catch (e) {
    console.error('[homey] triggerFlow failed', id, e)
  }
}

export function capValue(deviceId, cap) {
  return get(devices)[deviceId]?.capabilities?.[cap]
}

/* ---------------------------------------------------------------------------
   INSIGHTS (historikus logok)

   Fontos: a getLogEntries CSAK a teljes log-azonosítót fogadja el
   (`homey:device:<uuid>:measure_power`), az uri-t maga hámozza le belőle. A
   korábbi `{ uri, id: 'measure_power' }` alak 404-cel elszállt ("Not Found:
   LogLocal with ID measure_power"), ezért volt minden grafikon nullán.

   Az sem igaz, hogy minden capability-hez van log: pl. az energiamérők
   `energy_power` néven logolnak, `measure_power` log nélkül. Ezért a szerkesztő
   a TÉNYLEGES loglistából (getLogs) választ, nem capability-nevekből tippel.
--------------------------------------------------------------------------- */

// A nem-eszköz (manager) logok emberi neve; ami nincs benne, az a nyers nevével jön.
const MGR_LABEL = {
  system: 'Homey rendszer',
  weather: 'Időjárás (Homey)',
  apps: 'Appok (CPU/memória)',
  logic: 'Logic változók',
  energy: 'Energia',
  presence: 'Jelenlét',
  zones: 'Zónák',
}

// Néhány log címe lefordítatlan i18n-kulcs (pl. "capability_title.meter_power_exported_tariff3"),
// ilyenkor a capability-ID olvashatóbb.
function prettyTitle(title, cap) {
  if (title && !/^capability_title\./.test(title)) return title
  return (cap || title || '').replace(/\./g, ' · ').replace(/_/g, ' ')
}

/** Egy nyers Log → a store-ban használt lapos alak. */
function normLog(l, devMap) {
  const p = String(l.id).split(':') // homey : <kind> : <ownerId> : <cap...>
  const kind = p[1] ?? ''
  const ownerId = p[2] ?? ''
  const cap = p.slice(3).join(':')
  const owner =
    kind === 'device'
      ? (devMap?.[ownerId]?.name ?? 'Törölt/ismeretlen eszköz')
      : (MGR_LABEL[ownerId] ?? ownerId)
  return {
    id: l.id,
    kind,
    deviceId: kind === 'device' ? ownerId : null,
    owner,
    cap,
    title: prettyTitle(l.title, cap),
    type: l.type ?? 'number',
    units: l.units ?? '',
    decimals: l.decimals ?? null,
    lastValue: l.lastValue ?? null,
  }
}

/** Az összes insight-log betöltése (admin grafikon-picker). */
export async function loadInsightLogs(devMap = null) {
  if (!api) return []
  try {
    const raw = await api.insights.getLogs()
    const list = Object.values(raw ?? {})
      .map((l) => normLog(l, devMap ?? get(devices)))
      .sort((a, b) => a.owner.localeCompare(b.owner, 'hu') || a.title.localeCompare(b.title, 'hu'))
    insightLogs.set(list)
    if (typeof window !== 'undefined') {
      window.homeyInsightLogs = list // dev: log-ID-k felderítése a konzolból
      console.info('[homey] %d insight-log', list.length)
    }
    return list
  } catch (e) {
    console.warn('[homey] getLogs failed', e)
    insightLogs.set([])
    return []
  }
}

/**
 * Teljes log-ID egy sorozat-konfigból. Elfogadja a régi alakot is
 * ({ deviceId, capability }), hogy a meglévő dashboardok ne törjenek el.
 */
export function insightLogId(ins) {
  if (!ins) return null
  if (ins.logId) return ins.logId
  const cap = ins.capability ?? ins.id
  if (ins.deviceId && cap) return `homey:device:${ins.deviceId}:${cap}`
  if (ins.uri && cap) return `${ins.uri}:${cap}`
  return null
}

/**
 * Insights idősor lekérése.
 * logId: TELJES log-azonosító, resolution: pl. 'last24Hours' | 'last7Days'.
 * Visszatér: { points: [{ t, v }], step, start, end, updatesIn } vagy null.
 * A lyukakat (v: null) kidobjuk, a boolean logokat 0/1-re képezzük.
 */
export async function fetchInsights(logId, resolution = 'last24Hours') {
  if (!api || !logId) return null
  try {
    const res = await api.insights.getLogEntries({ id: logId, resolution })
    const raw = Array.isArray(res?.values) ? res.values : null
    if (!raw) {
      console.warn('[homey] insights: váratlan válasz', logId, res && Object.keys(res))
      return null
    }
    const points = raw
      .map((e) => ({ t: Date.parse(e?.t), v: typeof e?.v === 'boolean' ? (e.v ? 1 : 0) : e?.v }))
      .filter((p) => typeof p.v === 'number' && Number.isFinite(p.v))
    return {
      points,
      step: res.step ?? null,
      start: res.start ?? null,
      end: res.end ?? null,
      updatesIn: res.updatesIn ?? null,
    }
  } catch (e) {
    console.warn('[homey] getLogEntries failed', logId, resolution, e?.message || e)
    return null
  }
}
