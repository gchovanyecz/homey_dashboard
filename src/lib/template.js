/* Infografika sablonok: egy csempe értéke nem csak egyetlen capability lehet,
   hanem szöveg + capability-hivatkozások keveréke is:

     {device_1.measure_temperature} → {device_1.target_temperature}
       →  "24.9 °C → 25 °C"     (aktuális → elvárt)

   A sablon MEGJELENÍT, nem számol: a tokenek helyére a formázott érték kerül,
   a köztük lévő szöveg (nyíl, kötőjel, szavak) változatlanul jelenik meg.

   A token forrás-része alias (device_1) vagy közvetlen deviceId. Az aliasokat
   az elem `sources` listája köti eszközhöz, így az eszközt ki lehet cserélni
   anélkül, hogy a sablont át kellene írni — a szerkesztő az alias helyén az
   eszköz NEVÉT mutatja.

   Módosító: `{device_1.measure_temperature:n}` → csak a szám, mértékegység
   nélkül (hogy ne ismételjük a °C-t minden tagnál). */

const REF_RE = /\{([^{}]*)\}/g
// { forrás . capability [ :n ] } — a forrás soha nem tartalmaz pontot (alias
// vagy deviceId), a capability viszont igen (al-mérések: meter_power.consumed)
const BODY_RE = /^([^.:]+)\.([^:]+?)(?::(n))?$/

/** Sablon részekre bontása: [{ t:'text', v } | { t:'ref', src, cap, bare }] */
export function splitTemplate(expr) {
  const s = String(expr ?? '')
  const parts = []
  let last = 0
  let m
  REF_RE.lastIndex = 0
  while ((m = REF_RE.exec(s))) {
    if (m.index > last) parts.push({ t: 'text', v: s.slice(last, m.index) })
    const hit = BODY_RE.exec(m[1].trim())
    // rossz token (nincs benne pont) maradjon látható szövegként — így a
    // szerkesztőben azonnal kiderül, hogy elírás van
    if (hit) parts.push({ t: 'ref', src: hit[1].trim(), cap: hit[2].trim(), bare: hit[3] === 'n' })
    else parts.push({ t: 'text', v: m[0] })
    last = m.index + m[0].length
  }
  if (last < s.length) parts.push({ t: 'text', v: s.slice(last) })
  return parts
}

/** Token szövege a részeiből. */
export const tokenText = (src, cap, bare = false) => `{${src}.${cap}${bare ? ':n' : ''}}`

/** Alias → deviceId. Ha nincs ilyen alias, magát a forrást deviceId-nek vesszük. */
export const srcDeviceId = (sources, src) =>
  (sources ?? []).find((s) => s.alias === src)?.deviceId ?? src

/** Szabad alias egy elemen belül (device_1, device_2, …). */
export function nextAlias(sources = []) {
  const used = new Set((sources ?? []).map((s) => s.alias))
  let n = 1
  while (used.has('device_' + n)) n++
  return 'device_' + n
}

/** Meglévő alias az eszközhöz, vagy új felvétele. → { alias, sources } */
export function ensureSource(sources, deviceId) {
  const list = sources ?? []
  const hit = list.find((s) => s.deviceId === deviceId)
  if (hit) return { alias: hit.alias, sources: list }
  const alias = nextAlias(list)
  return { alias, sources: [...list, { alias, deviceId }] }
}

/** A sablonban hivatkozott (deviceId, capability) párok — feliratkozáshoz. */
export function templateRefs(expr, sources) {
  const out = []
  for (const p of splitTemplate(expr)) {
    if (p.t !== 'ref') continue
    const deviceId = srcDeviceId(sources, p.src)
    if (!deviceId || !p.cap) continue
    if (!out.some((r) => r.deviceId === deviceId && r.capability === p.cap)) out.push({ deviceId, capability: p.cap })
  }
  return out
}

/** Csak a tényleg használt aliasok maradjanak a sources-ban. */
export function pruneSources(expr, sources) {
  const used = new Set(splitTemplate(expr).filter((p) => p.t === 'ref').map((p) => p.src))
  return (sources ?? []).filter((s) => used.has(s.alias))
}

/**
 * Tokenek normalizálása: a nyers deviceId-s hivatkozásokat (ilyen kerül a
 * sablonba drag&drop / beillesztés után) aliassá írja át, és felveszi a
 * forráslistába. Csak létező eszközre — elírásból ne keletkezzen forrás.
 * @param isDevice (id) → boolean
 * @returns { expr, sources }
 */
export function normalizeTemplate(expr, sources, isDevice = () => true) {
  const parts = splitTemplate(expr)
  let list = sources ?? []
  let changed = false
  let out = ''
  for (const p of parts) {
    if (p.t === 'text') { out += p.v; continue }
    let src = p.src
    if (!list.some((s) => s.alias === src) && isDevice(src)) {
      const r = ensureSource(list, src)
      list = r.sources
      src = r.alias
      changed = true
    }
    out += tokenText(src, p.cap, p.bare)
  }
  // Nem prunolunk: ha valaki átmenetileg kitöröl egy tokent (átírja a
  // sablont), ne veszítse el az alias→eszköz kötést. A használatlan forrás
  // ártalmatlan, a szerkesztő is csak a használtakat listázza.
  // Ha nem kellett átírni, az EREDETI szöveg menjen vissza — a whitespace
  // átrendezése elugrasztaná a kurzort gépelés közben.
  return { expr: changed ? out : expr, sources: list }
}


/**
 * Sablon kiértékelése — behelyettesítés, nem számítás.
 * @param read (deviceId, capability) → { text, bare } | null
 *        text: érték mértékegységgel ("24.9 °C"), bare: csak az érték ("24.9")
 * @returns { kind:'ref', deviceId, capability }   — egyetlen csupasz token
 *        | { kind:'text', text }                  — behelyettesített szöveg
 *        | { kind:'none' }                        — nincs mit mutatni
 */
export function evalTemplate(expr, sources, read) {
  const parts = splitTemplate(expr)
  const refs = parts.filter((p) => p.t === 'ref')
  if (!refs.length) {
    const text = parts.map((p) => p.v).join('').trim()
    return text ? { kind: 'text', text } : { kind: 'none' }
  }
  /* Egyetlen csupasz token → sima capability-érték: így kapja meg a widget a
     mértékegységet, az enum-címkét és a kitöltés-sávot is. */
  if (refs.length === 1 && !refs[0].bare && parts.every((p) => p.t === 'ref' || !p.v.trim())) {
    return { kind: 'ref', deviceId: srcDeviceId(sources, refs[0].src), capability: refs[0].cap }
  }
  let out = ''
  for (const p of parts) {
    if (p.t === 'text') { out += p.v; continue }
    const v = read(srcDeviceId(sources, p.src), p.cap)
    out += v ? (p.bare ? v.bare : v.text) : '—'
  }
  out = out.trim()
  return out ? { kind: 'text', text: out } : { kind: 'none' }
}
