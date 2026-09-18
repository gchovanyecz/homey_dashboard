/**
 * Open-Meteo időjárás (ingyenes, API-kulcs nélkül), ~15 perces localStorage cache.
 * Docs: https://open-meteo.com/en/docs
 */

// WMO weather-code → kondíció + magyar szöveg
function mapCode(code) {
  if (code === 0) return { cond: 'sun', text: 'Napos' }
  if (code === 1) return { cond: 'sun', text: 'Derült' }
  if (code === 2) return { cond: 'partly', text: 'Részben felhős' }
  if (code === 3) return { cond: 'cloud', text: 'Felhős' }
  if (code === 45 || code === 48) return { cond: 'cloud', text: 'Köd' }
  if (code >= 51 && code <= 67) return { cond: 'rain', text: 'Eső' }
  if (code >= 71 && code <= 77) return { cond: 'snow', text: 'Havazás' }
  if (code >= 80 && code <= 82) return { cond: 'rain', text: 'Zápor' }
  if (code === 85 || code === 86) return { cond: 'snow', text: 'Hózápor' }
  if (code >= 95) return { cond: 'storm', text: 'Zivatar' }
  return { cond: 'cloud', text: 'Felhős' }
}

const DAY = ['Vas', 'Hét', 'Ked', 'Sze', 'Csü', 'Pén', 'Szo']

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function uvText(v) {
  if (v == null) return '—'
  const n = Math.round(v)
  const sev = n < 3 ? 'alacsony' : n < 6 ? 'mérsékelt' : n < 8 ? 'magas' : n < 11 ? 'nagyon magas' : 'extrém'
  return `${n} (${sev})`
}

export async function fetchWeather({ lat, lon, days = 7, name = '' }) {
  const key = `weather:${lat},${lon},${days}`
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null')
    if (cached && Date.now() - cached.ts < 15 * 60 * 1000) return cached.data
  } catch {}

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise` +
    `&timezone=auto&forecast_days=${days}`

  const res = await fetch(url)
  if (!res.ok) throw new Error('weather ' + res.status)
  const j = await res.json()
  const cur = j.current,
    d = j.daily
  const c0 = mapCode(cur.weather_code)

  const data = {
    temp: Math.round(cur.temperature_2m),
    cond: c0.cond,
    condText: c0.text,
    loc: name,
    details: {
      rain: d.precipitation_probability_max?.[0] ?? 0,
      wind: Math.round(cur.wind_speed_10m),
      humidity: Math.round(cur.relative_humidity_2m),
      pressure: Math.round(cur.surface_pressure),
      uv: uvText(d.uv_index_max?.[0]),
      sunrise: fmtTime(d.sunrise?.[0]),
    },
    forecast: d.time.map((t, i) => ({
      d: DAY[new Date(t).getDay()],
      cond: mapCode(d.weather_code[i]).cond,
      hi: Math.round(d.temperature_2m_max[i]),
      lo: Math.round(d.temperature_2m_min[i]),
    })),
  }

  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch {}
  return data
}
