/* MOHU hulladéknaptár — kliensoldali réteg.
   Az adat a saját szerver-proxyn át jön (`/api/mohu/...`), már JSON-ra bontva:
   a HTML-parszolás a szerveren történik (lásd server/mohu.js), mert a panel
   régi WebView-jában nem akarunk DOM-mal dolgozni. */

const api = async (path, params) => {
  const q = new URLSearchParams(params ?? {}).toString()
  const res = await fetch(`/api/mohu/${path}${q ? '?' + q : ''}`)
  if (!res.ok) throw new Error(`mohu ${path} ${res.status}`)
  return res.json()
}

/* localStorage cache — a néma try/catch a kioszk-böngésző quota/privát módja
   miatt kell (ugyanaz a minta, mint a bkk.js-ben és a weather.js-ben). */
function cachedGet(key, ttl) {
  try {
    const c = JSON.parse(localStorage.getItem(key) || 'null')
    if (c && Date.now() - c.ts < ttl) return c.data
  } catch {}
  return null
}
const cachedSet = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch {}
}

/* ---------- típusok ---------- */

// A MOHU a cella CSS-osztályával jelöli a típust. Ami nincs itt, az is
// megjelenik: a feliratot a válasz adja, csak generikus ikont/színt kap.
export const TYPE_ICON = { communal: 'trash', selective: 'recycle', bio: 'leaf' }
export const TYPE_COLOR = { communal: '#9aa0a6', selective: '#4c8dff', bio: '#7ed957' }
const TYPE_ORDER = ['communal', 'selective', 'bio']
export const iconOf = (k) => TYPE_ICON[k] ?? 'trash'
export const colorOf = (k) => TYPE_COLOR[k] ?? '#b39cff'
const orderOf = (k) => {
  const i = TYPE_ORDER.indexOf(k)
  return i < 0 ? 99 : i
}

/* ---------- dátum (saját, Intl nélkül — a panel WebView-ja miatt) ---------- */

const DAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat']
const MONTHS = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.']

/** Helyi nap kulcsa (YYYY-MM-DD). SOHA nem toISOString(): az UTC miatt este átfordulna. */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Naptári napok különbsége két YYYY-MM-DD között (UTC-ben számolva → nyári időszámítás-biztos). */
export function dayDiff(fromIso, toIso) {
  const [ay, am, ad] = String(fromIso).split('-').map(Number)
  const [by, bm, bd] = String(toIso).split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
}
export const relText = (n) => (n === 0 ? 'ma' : n === 1 ? 'holnap' : n === 2 ? 'holnapután' : `${n} nap`)
/** { day: 'hétfő', date: 'szept. 21.' } */
export function fmtHu(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return { day: DAYS[new Date(y, m - 1, d).getDay()], date: `${MONTHS[m - 1]} ${d}.` }
}

/* ---------- lekérdezések ---------- */

export const isConfigured = (a) => !!(a?.district && a?.publicPlace && a?.houseNumber)

/** A naptár 5 hétre előre; 6 órás cache (a MOHU-nál is ennyi a szerveroldali TTL). */
export async function fetchCalendar(addr) {
  if (!isConfigured(addr)) return { fetchedAt: 0, entries: [] }
  const key = `mohu:cal:${addr.district}|${addr.publicPlace}|${addr.houseNumber}`
  const hit = cachedGet(key, 6 * 3600e3)
  if (hit) return hit
  const data = await api('calendar', {
    district: addr.district,
    publicPlace: addr.publicPlace,
    houseNumber: addr.houseNumber,
  })
  cachedSet(key, data)
  if (typeof window !== 'undefined') window.mohuLast = data
  return data
}

// az admin listái: gyakorlatilag sosem változnak
/** A naptárban előforduló típusok (a beállítások kapcsolóihoz). */
export function typesOf(entries) {
  const out = new Map()
  for (const e of entries ?? []) for (const t of e.types ?? []) if (!out.has(t.key)) out.set(t.key, t.label)
  return [...out].map(([key, label]) => ({ key, label, icon: iconOf(key), color: colorOf(key) }))
}

export const fetchDistricts = () => api('districts')
export const fetchPlaces = (district) => api('places', { district })
export const fetchHouseNumbers = (district, publicPlace) => api('housenumbers', { district, publicPlace })

/**
 * Típusonként a következő (mai vagy jövőbeli) szállítás, legközelebbi elöl.
 * @param hidden kizárt típuskulcsok (a beállításokban kikapcsolt típusok)
 */
export function nextByType(entries, today = dayKey(), hidden = []) {
  const skip = new Set(hidden ?? [])
  const seen = new Map()
  for (const e of entries ?? []) {
    if (e.date < today) continue // YYYY-MM-DD-nél a szöveges összehasonlítás helyes
    for (const t of e.types ?? []) {
      if (skip.has(t.key) || seen.has(t.key)) continue
      const days = dayDiff(today, e.date)
      const f = fmtHu(e.date)
      seen.set(t.key, {
        key: t.key,
        label: t.label,
        date: e.date, // ISO — ezzel rendezünk
        days,
        rel: relText(days),
        dayName: f.day, // 'hétfő'
        dateText: f.date, // 'szept. 21.'
        icon: iconOf(t.key),
        color: colorOf(t.key),
      })
    }
  }
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date) || orderOf(a.key) - orderOf(b.key))
}
