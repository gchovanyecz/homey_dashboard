/**
 * Külső API-k proxyzása egy helyen. Azért közös modul, mert ugyanez kell a
 * produkciós szervernek (`server.js`) és a Vite dev/preview middleware-jének
 * (`vite.config.js`) — korábban a BKK-ág szó szerint duplikálva volt.
 *
 * Mindkét helyről natív `http.ServerResponse` érkezik, így elég egy implementáció.
 */
import { mohuRoute } from './mohu.js'

const BKK_BASE = 'https://futar.bkk.hu/api/query/v1/ws/otp/api/where'

const fail = (res, e) => {
  res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: String(e?.message || e) }))
}

function bkkProxy(req, res) {
  // a nyers req.url kell (a dekódolt path elveszti a query stringet)
  fetch(BKK_BASE + req.url.slice('/api/bkk'.length))
    .then(async (r) => {
      const body = await r.text()
      res.writeHead(r.status, { 'content-type': 'application/json' })
      res.end(body)
    })
    .catch((e) => fail(res, e))
}

/** true = a kérést mi szolgáltuk ki; false = menjen tovább a szokásos úton. */
export function handleApi(req, res) {
  const u = req.url || ''
  if (u.startsWith('/api/bkk')) {
    bkkProxy(req, res)
    return true
  }
  if (u.startsWith('/api/mohu')) {
    mohuRoute(req, res).catch((e) => fail(res, e))
    return true
  }
  return false
}
