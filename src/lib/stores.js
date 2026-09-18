import { writable } from 'svelte/store'

// Kapcsolat állapota: 'disconnected' | 'connecting' | 'connected' | 'error'
export const connection = writable({ status: 'disconnected', error: null })

// Eszköz-állapot map: { [deviceId]: { id, name, capabilities: { [capId]: value }, _device } }
export const devices = writable({})

// Flow-k (admin device/flow picker): [{ id, name, advanced, enabled, folder }]
export const flows = writable([])

// Homey Mood-ok (hangulatok/jelenetek): [{ id, name, zone, favorite }]
export const moods = writable([])

// Zónák: [{ id, name, parent }]
export const zones = writable([])

// Insights logok (admin grafikon-picker). A Homey-n minden logolt capability + a
// manager-logok (rendszer, időjárás, appok, Logic változók) is itt jönnek:
// [{ id, kind, deviceId, owner, cap, title, type, units, decimals, lastValue }]
// Az `id` a TELJES log-azonosító (pl. `homey:device:<uuid>:measure_power`) — a
// getLogEntries csak ezt fogadja el.
export const insightLogs = writable([])
