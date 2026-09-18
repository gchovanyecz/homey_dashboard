/**
 * BKK FUTÁR API kliens — a saját `/api/bkk` proxyn keresztül (CORS-mentes).
 * A proxy továbbít a futar.bkk.hu-ra. API-kulcs: a `bkk` store-ból (Beállítások).
 *
 *   /api/bkk/search.json?query=…                 → megálló keresés
 *   /api/bkk/arrivals-and-departures-for-stop.json?stopId=…  → élő indulások
 */
import { get } from 'svelte/store'
import { bkk } from './dashboards.js'

const APP_VERSION = 'nspanel-1.0'

// Járattípus → ikon (icons.js) és tartalék szín (ha a route-nak nincs színe).
export const TYPE_ICON = {
  BUS: 'bus',
  COACH: 'bus',
  TRAM: 'tram',
  SUBWAY: 'metro',
  TROLLEYBUS: 'trolley',
  RAIL: 'rail',
  SUBURBAN_RAILWAY: 'rail',
  FERRY: 'ferry',
}
export const TYPE_COLOR = {
  BUS: '#009ee3',
  COACH: '#f9ab13',
  TRAM: '#f5c400',
  SUBWAY: '#e41f18',
  TROLLEYBUS: '#b3261e',
  RAIL: '#00a651',
  SUBURBAN_RAILWAY: '#00a651',
  FERRY: '#0a4f9e',
}
export const iconOf = (type) => TYPE_ICON[type] ?? 'bus'
export const colorOf = (type, color) => (color ? '#' + String(color).replace(/^#/, '') : TYPE_COLOR[type] ?? '#6c6c76')

export const minsUntil = (depSec, nowSec) => Math.max(0, Math.ceil((depSec - nowSec) / 60))

function apiKey() {
  return get(bkk)?.apiKey?.trim() || ''
}

function q(params) {
  const p = new URLSearchParams(params)
  p.set('key', apiKey())
  p.set('version', '4')
  p.set('appVersion', APP_VERSION)
  p.set('includeReferences', 'true')
  return p.toString()
}

/**
 * Megálló keresés név alapján. A találatokat "helyekké" csoportosítja: egy hely a
 * fizikai megállók (locationType 0) halmaza egy állomás alatt — pl. „Deák Ferenc tér" a
 * két menetirányú megállóval. Így minden járat minden irányban felsorolható (statikusan).
 * Visszatér: { places: [{ id, name, localityName, stopIds:[], routeIds:[] }], stops, routes }
 */
export async function searchStops(query) {
  if (!apiKey()) throw new Error('nincs BKK API-kulcs')
  const res = await fetch(`/api/bkk/search.json?${q({ query })}`)
  if (!res.ok) throw new Error('bkk search ' + res.status)
  const j = await res.json()
  const stops = j?.data?.references?.stops ?? {}
  const routes = j?.data?.references?.routes ?? {}

  // fizikai megállók csoportosítása állomásonként (parentStationId, vagy saját id)
  const groups = new Map()
  for (const s of Object.values(stops)) {
    if (s.locationType !== 0) continue // csak fizikai megállók (nem stop-area)
    const gid = s.parentStationId || s.id
    if (!groups.has(gid)) groups.set(gid, { id: gid, name: s.name, localityName: s.localityName, stopIds: [], routeIds: new Set() })
    const g = groups.get(gid)
    g.stopIds.push(s.id)
    ;(s.routeIds ?? []).forEach((r) => g.routeIds.add(r))
  }
  let places = [...groups.values()].map((g) => ({ ...g, routeIds: [...g.routeIds] }))

  // tartalék: ha nem jött fizikai megálló, a nyers stopIds-ből építünk helyeket
  if (!places.length) {
    const ids = j?.data?.entry?.stopIds ?? []
    places = ids
      .map((id) => stops[id])
      .filter(Boolean)
      .map((s) => ({ id: s.id, name: s.name, localityName: s.localityName, stopIds: [s.id], routeIds: s.routeIds ?? [] }))
  }
  // a több járatot érintő helyek előre
  places.sort((a, b) => b.routeIds.length - a.routeIds.length)
  return { places, stops, routes }
}

/**
 * Indulások lekérése egy vagy több megállóra (batch), rövid cache-sel.
 * Visszatér: { now, items: [{ stopId, routeId, shortName, type, color, textColor, headsign, depSec }] }
 */
export async function fetchDepartures(stopIds, { minutesAfter = 60 } = {}) {
  const ids = [...new Set((stopIds ?? []).filter(Boolean))]
  if (!ids.length) return { now: Math.floor(Date.now() / 1000), items: [] }
  if (!apiKey()) throw new Error('nincs BKK API-kulcs')

  const key = `bkk:dep:${ids.slice().sort().join(',')}`
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null')
    if (cached && Date.now() - cached.ts < 30 * 1000) return cached.data
  } catch {}

  const params = new URLSearchParams()
  for (const id of ids) params.append('stopId', id)
  params.set('onlyDepartures', 'true')
  params.set('minutesBefore', '0')
  params.set('minutesAfter', String(minutesAfter))
  params.set('limit', '80')
  params.set('key', apiKey())
  params.set('version', '4')
  params.set('appVersion', APP_VERSION)
  params.set('includeReferences', 'true')

  const res = await fetch(`/api/bkk/arrivals-and-departures-for-stop.json?${params.toString()}`)
  if (!res.ok) throw new Error('bkk departures ' + res.status)
  const j = await res.json()
  const d = j?.data ?? {}
  const routes = d.references?.routes ?? {}
  const trips = d.references?.trips ?? {}
  const stopTimes = d.entry?.stopTimes ?? []

  const items = stopTimes
    .map((st) => {
      const trip = trips[st.tripId] ?? {}
      const route = routes[trip.routeId] ?? {}
      const depSec = st.predictedDepartureTime ?? st.departureTime
      if (!depSec) return null
      return {
        stopId: st.stopId,
        routeId: trip.routeId,
        shortName: route.shortName ?? '?',
        type: route.type ?? 'BUS',
        color: route.color ?? null,
        textColor: route.textColor ?? null,
        headsign: st.stopHeadsign ?? trip.tripHeadsign ?? '',
        depSec,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.depSec - b.depSec)

  const data = { now: d.currentTime ?? Math.floor(Date.now() / 1000), items }
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }))
  } catch {}
  if (typeof window !== 'undefined') window.bkkLast = j // dev: nyers válasz ellenőrzéshez
  return data
}
