/**
 * MOHU hulladéknaptár proxy + parszolás (mohubudapest.hu).
 *
 * Miért szerveroldalon? Két okból:
 *   1. CORS — a MOHU nem engedi a böngészőből a saját domainjén kívülről;
 *   2. a válaszok HTML-partial-ök JSON-be csomagolva, a panel régi WebView-jában
 *      pedig nem akarunk DOM-ot parszolni. Itt regexszel kibontjuk, és a kliens
 *      kész JSON-t kap.
 *
 * Az oldal OctoberCMS AJAX-partial-ökkel dolgozik: POST a naptár-oldalra,
 * `X-October-Request-Handler` + `X-October-Request-Partials` fejlécekkel.
 *
 *   onSelectDistricts / ajax/publicPlaces   ← district=1213
 *   onSavePublicPlace / ajax/houseNumbers   ← publicPlace=Váci---utca    (a kerület a SESSION-ből!)
 *   onSearch          / ajax/calSearchResults ← district + publicPlace + houseNumber (cookie nem kell)
 *
 * A házszám-lekérés ezért kétlépcsős: előbb a kerület-hívás (annak a cookie-ja
 * viszi a kerületet), és ugyanazzal a cookie-val jön a házszám-lista.
 */

const BASE = 'https://mohubudapest.hu/hulladeknaptar'
const UA = 'Mozilla/5.0 (compatible; nspanel-dashboard/1.0)'
const TTL_LIST = 24 * 3600e3 // kerület/utca/házszám: napokig sem változik
const TTL_CAL = 6 * 3600e3 // naptár: hetekre előre fix

const hdr = (handler, partial) => ({
  'X-Requested-With': 'XMLHttpRequest',
  'X-October-Request-Handler': handler,
  'X-October-Request-Partials': partial,
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent': UA,
})

/** Set-Cookie → "a=1; b=2" (a session továbbvitelére). */
function cookiesOf(res) {
  const all =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie')].filter(Boolean)
  return all.map((s) => String(s).split(';')[0]).join('; ')
}

async function post(handler, partial, body, cookie, ms = 8000) {
  const res = await fetch(BASE, {
    method: 'POST',
    signal: AbortSignal.timeout(ms),
    headers: { ...hdr(handler, partial), ...(cookie ? { Cookie: cookie } : {}) },
    body: new URLSearchParams(body).toString(),
  })
  if (!res.ok) throw new Error(`mohu ${handler} ${res.status}`)
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    // a MOHU sűrű hívásra néha HTML hibaoldalt ad — ez nem érvényes válasz
    throw new Error(`mohu ${handler}: nem JSON válasz`)
  }
  return { json, cookie: cookiesOf(res) }
}

/* ---------- parszolás (regex, nincs DOM és nincs függőség) ---------- */

const decode = (s) =>
  String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))

const strip = (s) => decode(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

/** `<option value="x">Címke</option>` párok. A „Kérem, válasszon” (value="false") kimarad. */
export function parseOptions(html) {
  const out = []
  for (const m of String(html ?? '').matchAll(/<option\s+value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)) {
    const value = decode(m[1])
    const label = strip(m[2])
    if (!value || value === 'false' || !label) continue
    out.push({ value, label })
  }
  return out
}

/* A szolgáltatás-cella osztálya adja a típust (communal | selective | bio | …);
   a bootstrap-segédosztályokat kiszűrjük. Ismeretlen típusnál is megy tovább:
   a felirat a cella szövegéből jön, a kliens generikus ikont tesz mellé. */
const UTIL = /^(d-inline-block|d-block|d-flex|mr-\d|ml-\d|py-\d|px-\d|my-\d|mx-\d|text-\w+)$/
const typeKey = (cls) =>
  (String(cls).split(/\s+/).find((c) => c && !UTIL.test(c)) ?? '').toLowerCase()

/** A naptár-tábla → [{ date:'2026-09-14', types:[{ key, label }] }] (csak a szállítási napok). */
export function parseCalendar(html) {
  const out = []
  for (const row of String(html ?? '').matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const tr = row[1]
    if (/<th\b/.test(tr)) continue // hét-elválasztó sor
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    const d = /(\d{4})\.(\d{2})\.(\d{2})/.exec(tds[1] ?? '')
    if (!d) continue
    const types = []
    for (const cell of (tds[2] ?? '').matchAll(/<div[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/div>/g)) {
      const key = typeKey(cell[1])
      const label = strip(cell[2])
      if (!key || !label || types.some((t) => t.key === key)) continue
      types.push({ key, label })
    }
    if (types.length) out.push({ date: `${d[1]}-${d[2]}-${d[3]}`, types })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/* ---------- cache: TTL + single-flight + hibára a régi adat ---------- */

const cache = new Map() // key → { ts, data, inflight }

async function cached(key, ttl, loader) {
  const e = cache.get(key)
  if (e?.data && Date.now() - e.ts < ttl) return e.data
  if (e?.inflight) return e.inflight
  const p = loader()
    .then((data) => {
      cache.set(key, { ts: Date.now(), data })
      return data
    })
    .catch((err) => {
      cache.set(key, { ts: e?.ts ?? 0, data: e?.data })
      if (e?.data) return e.data // a MOHU pillanatnyi hibája ne ürítse ki a widgetet
      throw err
    })
  cache.set(key, { ...(e ?? {}), inflight: p })
  return p
}

/* ---------- lekérdezések ---------- */

/** Kerületek: a naptár-oldal HTML-jében lévő <select id="districts">. */
export const districts = () =>
  cached('districts', TTL_LIST, async () => {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error('mohu oldal ' + res.status)
    const html = await res.text()
    const sel = /<select[^>]*id="districts"[^>]*>([\s\S]*?)<\/select>/.exec(html)
    const list = parseOptions(sel ? sel[1] : '')
    if (!list.length) throw new Error('mohu: nem találom a kerületlistát')
    return list
  })

export const places = (district) =>
  cached(`places:${district}`, TTL_LIST, async () => {
    const { json } = await post('onSelectDistricts', 'ajax/publicPlaces', { district })
    return parseOptions(json['.publicPlaces'])
  })

/** Házszámok: a kerületet a session viszi, ezért két hívás EGY cookie-val. */
export const houseNumbers = (district, publicPlace) =>
  cached(`houses:${district}|${publicPlace}`, TTL_LIST, async () => {
    const first = await post('onSelectDistricts', 'ajax/publicPlaces', { district })
    const { json } = await post('onSavePublicPlace', 'ajax/houseNumbers', { publicPlace }, first.cookie)
    return parseOptions(json['.houseNumbers'])
  })

export const calendar = (district, publicPlace, houseNumber) =>
  cached(`cal:${district}|${publicPlace}|${houseNumber}`, TTL_CAL, async () => {
    const { json } = await post('onSearch', 'ajax/calSearchResults', { district, publicPlace, houseNumber })
    const html = json['.results'] ?? ''
    // érvénytelen címre a MOHU „Nincs adat”-ot ad — ez nem hiba, csak üres naptár
    return { fetchedAt: Date.now(), entries: parseCalendar(html) }
  })

/* ---------- HTTP route ---------- */

/** `/api/mohu/...` kiszolgálása. Csak akkor hívd, ha a prefix egyezik. */
export async function mohuRoute(req, res) {
  const u = new URL(req.url, 'http://localhost')
  const p = u.pathname.slice('/api/mohu'.length)
  const q = (k) => (u.searchParams.get(k) ?? '').trim()
  let data
  if (p === '/districts') data = await districts()
  else if (p === '/places') data = await places(q('district'))
  else if (p === '/housenumbers') data = await houseNumbers(q('district'), q('publicPlace'))
  else if (p === '/calendar') data = await calendar(q('district'), q('publicPlace'), q('houseNumber'))
  else {
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'ismeretlen végpont' }))
    return
  }
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}
