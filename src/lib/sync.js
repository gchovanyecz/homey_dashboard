/**
 * Közös állapot szinkronizálás a `/api/state` végponton keresztül
 * (kis Node szerver / Vite dev middleware szolgálja ki egy fájlba).
 * Ha nincs szerver (tisztán statikus hosting), a hívások csendben elbuknak,
 * és a localStorage marad az egyetlen tároló (egy eszközön belül működik).
 */
const API = '/api/state'

export async function getState() {
  try {
    const r = await fetch(API, { cache: 'no-store' })
    if (r.ok) {
      const t = await r.text()
      return t && t !== 'null' ? JSON.parse(t) : null
    }
  } catch {}
  return null
}

export async function putState(state) {
  try {
    await fetch(API, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state),
    })
    return true
  } catch {
    return false
  }
}
