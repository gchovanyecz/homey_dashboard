/* Capability-értékek megjelenítése — a Homey metaadataiból (units, decimals,
   min/max, enum-címkék). Az infografika widget és az admin élő előnézete
   ugyanezt használja, hogy a szerkesztőben pont az látszódjon, ami a panelen.

   Az `it` (infografika-elem) lehet sima capability-hivatkozás
   ({ deviceId, capability }) vagy sablon ({ expr, sources }) — lásd template.js. */
import { evalTemplate, templateRefs } from './template.js'

/* A Homey néhány százalékos capability-t 0..1-ben tárol (dim,
   windowcoverings_set), de '%' mértékegységgel — ilyenkor 100-szorozunk.
   CSAK akkor, ha a max KIFEJEZETTEN ≤ 1: a measure_humidity is '%', de nincs
   max-ja és már 0..100-ban jön, azt felszorozva 7450% lett belőle. */
export const isUnitFraction = (m) => m?.units === '%' && typeof m.max === 'number' && m.max <= 1

/* Nagyságrendhez illő tizedesek: 2414.47 W → 2414 W, de 24.9 °C marad.
   A pontos nulla maradjon "0", ne "0.00" (a luminance 2 tizedest kér). */
export function fmtNum(n, decimals) {
  const a = Math.abs(n)
  const dec = a === 0 ? 0 : a >= 100 ? 0 : a >= 10 ? 1 : Math.min(decimals ?? 1, 2)
  return n.toFixed(dec)
}

export const capMeta = (devs, deviceId, capability) => devs?.[deviceId]?.capsMeta?.[capability] ?? null
export const capValue = (devs, deviceId, capability) => devs?.[deviceId]?.capabilities?.[capability]

/** Egyetlen capability formázva: { text, unit, dim?, off? } */
export function fmtCap(devs, deviceId, capability, unitOverride) {
  const m = capMeta(devs, deviceId, capability)
  const v = capValue(devs, deviceId, capability)
  if (v === null || v === undefined) return { text: '—', unit: '', dim: true }
  if (typeof v === 'boolean') return { text: v ? 'Be' : 'Ki', unit: '', off: !v }
  if (m?.type === 'enum') {
    const hit = (m.values ?? []).find((x) => x.id === v)
    return { text: hit?.title ?? String(v), unit: '' }
  }
  if (typeof v === 'number') {
    const scaled = isUnitFraction(m) ? v * 100 : v
    return { text: fmtNum(scaled, m?.decimals), unit: unitOverride ?? (isUnitFraction(m) ? '%' : (m?.units ?? '')) }
  }
  const s = String(v)
  return { text: s.length > 12 ? s.slice(0, 12) + '…' : s, unit: '' }
}

/* Sablon-hivatkozás olvasása: `text` mértékegységgel, `bare` nélküle (a
   :n módosítóhoz, hogy ne ismétlődjön a °C minden tagnál). */
const readerFor = (devs) => (deviceId, capability) => {
  const v = capValue(devs, deviceId, capability)
  if (v === null || v === undefined) return null
  const f = fmtCap(devs, deviceId, capability)
  return { text: f.unit ? `${f.text} ${f.unit}` : f.text, bare: f.text }
}

/** Az elem által hivatkozott (deviceId, capability) párok — feliratkozáshoz. */
export const itemRefs = (it) =>
  it?.expr ? templateRefs(it.expr, it.sources) : [{ deviceId: it?.deviceId, capability: it?.capability }]

/** Ha az elem végül EGYETLEN capability-t jelent, akkor melyiket (különben null). */
export function itemRef(devs, it) {
  if (!it?.expr) return it?.deviceId ? { deviceId: it.deviceId, capability: it.capability } : null
  const r = evalTemplate(it.expr, it.sources, readerFor(devs))
  return r.kind === 'ref' ? { deviceId: r.deviceId, capability: r.capability } : null
}

/** Az elem megjelenített értéke: { text, unit, dim?, off? } */
export function itemValue(devs, it) {
  if (!it?.expr) return fmtCap(devs, it?.deviceId, it?.capability, it?.unit)
  const r = evalTemplate(it.expr, it.sources, readerFor(devs))
  if (r.kind === 'ref') return fmtCap(devs, r.deviceId, r.capability, it.unit)
  if (r.kind === 'text') return { text: r.text, unit: it.unit ?? '' }
  return { text: '—', unit: '', dim: true }
}

/** Kitöltés 0..1, ha az elem egyetlen, tartománnyal bíró capability-t mutat. */
export function itemRatio(devs, it) {
  const ref = itemRef(devs, it)
  if (!ref?.deviceId || !ref.capability) return null
  const m = capMeta(devs, ref.deviceId, ref.capability)
  const v = capValue(devs, ref.deviceId, ref.capability)
  if (typeof v !== 'number' || !m) return null
  const min = m.min ?? (m.units === '%' ? 0 : null)
  const max = m.max ?? (m.units === '%' ? (isUnitFraction(m) ? 1 : 100) : null)
  if (min === null || max === null || max <= min) return null
  return Math.max(0, Math.min(1, (v - min) / (max - min)))
}

/** Csempe-címke: kézi címke → capability-cím → eszköznév → sorszám. */
export function itemLabel(devs, it, i = 0) {
  if (it?.label) return it.label
  const ref = itemRef(devs, it)
  if (!ref?.deviceId) return `Érték ${i + 1}`
  return capMeta(devs, ref.deviceId, ref.capability)?.title || devs?.[ref.deviceId]?.name || `Érték ${i + 1}`
}
