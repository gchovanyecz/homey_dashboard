/* Könnyű inline-SVG grafikonok (nincs külső lib; gyenge eszközre optimalizált).
   A torta/fánk zöld, sraffozott + kiemelt szegmens designnal; a diagramok
   reszponzívak (fix viewBox + width/height:100%), így kitöltik a helyet. */

// A grafikon-sorozatok választható színei. A sorrend adja az alapértelmezést is
// (1. sorozat borostyán, 2. türkiz, …), a kulcsot a widget-konfig tárolja.
export const SERIES_COLORS = [
  { value: 'amber', label: 'Borostyán', hex: '#ffb84d' },
  { value: 'teal', label: 'Türkiz', hex: '#37d3b0' },
  { value: 'blue', label: 'Kék', hex: '#4c8dff' },
  { value: 'purple', label: 'Lila', hex: '#b39cff' },
  { value: 'red', label: 'Piros', hex: '#ff7a89' },
  { value: 'green', label: 'Zöld', hex: '#7ed957' },
  { value: 'yellow', label: 'Sárga', hex: '#ffd23f' },
  { value: 'cyan', label: 'Cián', hex: '#4fd1ff' },
]
export const PAL = SERIES_COLORS.map((c) => c.hex)
/** Sorozat-szín: a beállított kulcs, vagy sorszám szerinti alapérték. */
export const seriesColor = (key, i = 0) =>
  SERIES_COLORS.find((c) => c.value === key)?.hex ?? PAL[i % PAL.length]
export const HL = '#5fd67f' // kiemelt szegmens

let _cid = 0
function hatchDefs(id) {
  return `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="4.5" height="4.5" patternTransform="rotate(45)"><rect width="4.5" height="4.5" fill="#2b5245"/><line x1="0" y1="0" x2="0" y2="4.5" stroke="#4f9575" stroke-width="1.7"/></pattern></defs>`
}

export function donutSVG(vals, opt = {}) {
  const S = 200,
    hl = opt.highlight ?? 0,
    thick = S * 0.12,
    r = S / 2 - thick / 2 - S * 0.05,
    cx = S / 2,
    cy = S / 2,
    C = 2 * Math.PI * r,
    sum = vals.reduce((a, b) => a + b, 0)
  const gap = C * 0.014,
    id = 'h' + _cid++
  let off = 0,
    segs = ''
  vals.forEach((v, i) => {
    const len = (C * v) / sum,
      draw = Math.max(0.6, len - gap),
      stroke = i === hl ? HL : `url(#${id})`
    segs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${thick}" stroke-dasharray="${draw.toFixed(2)} ${(C - draw).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`
    off += len
  })
  const track = `<circle cx="${cx}" cy="${cy}" r="${S / 2 - 2}" fill="none" stroke="#24242d" stroke-width="3"/>`
  let ct = ''
  if (opt.full) {
    ct = `<text x="${cx}" y="${cy - S * 0.12}" text-anchor="middle" fill="#6fd98c" font-size="${(S * 0.072).toFixed(1)}" font-weight="600">${opt.sublabel || ''}</text>
      <text x="${cx}" y="${cy - S * 0.02}" text-anchor="middle" dominant-baseline="middle" fill="#6fd98c" font-size="${(S * 0.135).toFixed(1)}" font-weight="800">${opt.subvalue || ''}</text>
      <line x1="${cx - S * 0.12}" y1="${cy + S * 0.055}" x2="${cx + S * 0.12}" y2="${cy + S * 0.055}" stroke="#3a3a42" stroke-width="1.1"/>
      <text x="${cx}" y="${cy + S * 0.11}" text-anchor="middle" fill="#8a8a94" font-size="${(S * 0.055).toFixed(1)}">total</text>
      <text x="${cx}" y="${cy + S * 0.2}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="${(S * 0.1).toFixed(1)}" font-weight="800">${opt.total || ''}</text>`
  } else if (opt.sublabel || opt.subvalue) {
    /* Kétsoros közép: felül a fogyasztó neve, alatta a mért érték. Ezt a
       végigpörgető (rotate) mód használja — a `full` elrendezéstől annyiban
       tér el, hogy nincs alatta az összeg. */
    ct = `<text x="${cx}" y="${cy - S * 0.055}" text-anchor="middle" fill="#8a8a94" font-size="${(S * 0.062).toFixed(1)}" font-weight="600">${opt.sublabel || ''}</text>
      <text x="${cx}" y="${cy + S * 0.045}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="${(S * 0.125).toFixed(1)}" font-weight="800">${opt.subvalue || ''}</text>`
  } else if (opt.center) {
    ct = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="${(S * 0.14).toFixed(1)}" font-weight="700">${opt.center}</text>`
  }
  return `<svg viewBox="0 0 ${S} ${S}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${hatchDefs(id)}${track}${segs}${ct}</svg>`
}

export function pieSVG(vals, opt = {}) {
  const S = 200,
    hl = opt.highlight ?? 0,
    r = S / 2 - 3,
    cx = S / 2,
    cy = S / 2,
    sum = vals.reduce((a, b) => a + b, 0),
    id = 'hp' + _cid++
  const gapA = 0.03
  let a0 = -Math.PI / 2,
    p = ''
  vals.forEach((v, i) => {
    const span = (2 * Math.PI * v) / sum,
      s = a0 + gapA / 2,
      e = a0 + span - gapA / 2,
      x0 = cx + r * Math.cos(s),
      y0 = cy + r * Math.sin(s),
      x1 = cx + r * Math.cos(e),
      y1 = cy + r * Math.sin(e),
      lg = e - s > Math.PI ? 1 : 0,
      fill = i === hl ? HL : `url(#${id})`
    p += `<path d="M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${lg} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${fill}"/>`
    a0 += span
  })
  return `<svg viewBox="0 0 ${S} ${S}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${hatchDefs(id)}${p}</svg>`
}

/**
 * Hosszú idősor ritkítása kirajzoláshoz (2016 pont/7 nap → kirajzolhatatlan).
 * SZÁNDÉKOSAN nem átlagol, hanem min/max decimációt csinál: bucketenként a
 * legkisebb és legnagyobb pontot tartja meg, időrendben. Átlagolással a
 * teljesítmény-tüskék eltűnnének (2400 W-os csúcsból 800 W lenne).
 */
export function downsample(arr, target = 140) {
  const a = (arr ?? []).filter((v) => Number.isFinite(v))
  if (a.length <= target) return a
  const buckets = Math.max(1, Math.floor(target / 2))
  const per = a.length / buckets
  const out = []
  for (let i = 0; i < buckets; i++) {
    const s0 = Math.floor(i * per)
    const s1 = Math.max(s0 + 1, Math.min(a.length, Math.floor((i + 1) * per)))
    let lo = s0,
      hi = s0
    for (let k = s0; k < s1; k++) {
      if (a[k] < a[lo]) lo = k
      if (a[k] > a[hi]) hi = k
    }
    if (lo === hi) out.push(a[lo])
    else if (lo < hi) out.push(a[lo], a[hi])
    else out.push(a[hi], a[lo])
  }
  return out
}

/**
 * Vonaldiagram. A sorozatok KÜLÖNBÖZŐ hosszúak lehetnek (más felbontás), ezért
 * az x-tengely sorozatonként számolódik. groups: skála-csoportok sorozatonként
 * (azonos csoport = közös min/max; a hívó mértékegység szerint csoportosít).
 * colors:
 * sorozatonkénti szín (hex); ami nincs megadva, az a paletta sorrendjét kapja.
 * fills: sorozatonkénti kitöltés; ami nincs megadva, arra a `fill` alapérték áll.
 * Szöveg SZÁNDÉKOSAN nincs benne: a preserveAspectRatio="none" szétnyújtaná —
 * a min/max feliratot a widget HTML-ben rakja rá.
 */
export function lineSVG(
  series,
  { axis = false, fill = false, colors = [], fills = [], groups = null } = {},
) {
  const W = 100,
    H = 100,
    pt = 5,
    pb = 5
  const list = (series ?? []).filter((s) => Array.isArray(s) && s.some((v) => Number.isFinite(v)))
  if (!list.length) return ''
  /* Skála-csoportok: az azonos csoportba tartozó sorozatok KÖZÖS min/max-szal
     rajzolódnak. A hívó a mértékegység szerint csoportosít — így a „hőmérséklet
     + célhőmérséklet” pár egy skálán fut (különben a konstans setpoint a saját
     tartománya alján ült, miközben a tengelyfelirat a másik sorozatét mutatta),
     a W és °C vegyes grafikon viszont továbbra is külön skálát kap.
     groups nélkül minden sorozat egy közös skálán van. */
  const gid = (i) => (groups?.[i] ?? 0)
  const bounds = new Map()
  list.forEach((s, i) => {
    const vals = s.filter((v) => Number.isFinite(v))
    const b = bounds.get(gid(i)) ?? { min: Infinity, max: -Infinity }
    b.min = Math.min(b.min, ...vals)
    b.max = Math.max(b.max, ...vals)
    bounds.set(gid(i), b)
  })
  let g = ''
  if (axis)
    for (let k = 0; k <= 3; k++) {
      const y = (pt + (k * (H - pt - pb)) / 3).toFixed(1)
      g += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#2a2a30" stroke-width="1" vector-effect="non-scaling-stroke"/>`
    }
  let paths = ''
  list.forEach((s, si) => {
    const vals = s.filter((v) => Number.isFinite(v))
    const { min, max } = bounds.get(gid(si))
    const rng = max - min
    const n = vals.length
    const X = (i) => (n < 2 ? (i === 0 ? 0 : W) : (i / (n - 1)) * W)
    const Y = (v) => H - pb - (rng ? (v - min) / rng : 0.5) * (H - pt - pb)
    // egyetlen pontból vízszintes vonal lesz, különben nem látszana semmi
    const pts = (n < 2 ? [vals[0], vals[0]] : vals).map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')
    const col = colors[si] ?? PAL[si % PAL.length]
    if (fills[si] ?? fill) paths += `<polygon points="0,${H} ${pts} ${W},${H}" fill="${col}" opacity="0.16"/>`
    paths += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`
  })
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="none">${g}${paths}</svg>`
}

