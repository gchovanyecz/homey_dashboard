/**
 * Pici, függőség nélküli produkciós szerver.
 * - kiszolgálja a `dist/`-et (dashboard: /, admin: /admin.html)
 * - `/api/state` GET/PUT → `data/state.json` (dashboardok + beállítások közös tárolója)
 *
 * Futtatás:  npm run build && node server.js   (vagy: npm run serve)
 * Port:      PORT env vagy 8090
 */
import http from 'node:http'
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve, extname, normalize } from 'node:path'
import { handleApi } from './server/api.js'

const DIST = resolve('dist')
const STATE = resolve('data/state.json')
const PORT = process.env.PORT || 8090

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0])

    // Külső API-k (BKK FUTÁR, MOHU hulladéknaptár) — közös modul, mert a
    // Vite dev/preview middleware ugyanezt használja (lásd vite.config.js).
    if (handleApi(req, res)) return

    if (url.startsWith('/api/state')) {
      if (req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(existsSync(STATE) ? readFileSync(STATE) : 'null')
        return
      }
      if (req.method === 'PUT') {
        let b = ''
        req.on('data', (c) => (b += c))
        req.on('end', () => {
          try {
            mkdirSync(resolve('data'), { recursive: true })
            writeFileSync(STATE, b)
            res.writeHead(204)
          } catch (e) {
            res.writeHead(500)
          }
          res.end()
        })
        return
      }
      res.writeHead(405)
      res.end()
      return
    }

    // statikus fájlok (SPA fallback index.html-re)
    let p = normalize(join(DIST, url))
    if (!p.startsWith(DIST)) {
      res.writeHead(403)
      res.end()
      return
    }
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html')
    if (!existsSync(p)) p = join(DIST, 'index.html')
    try {
      const data = readFileSync(p)
      /* Cache-fejlécek. Eddig EGY SEM volt, ezért a böngésző a saját heurisztikája
         szerint tarthatta meg a HTML-t — a friss deploy után is a RÉGI index.html-t
         (és vele a régi, hash-elt asset-eket) szolgálta ki, vagyis „nem látszott a
         változás". A /assets/* fájlnevében ott a tartalom-hash, azok tehát örökre
         cache-elhetők; a HTML viszont mindig ellenőrizze magát. */
      const hashed = url.startsWith('/assets/')
      res.writeHead(200, {
        'content-type': MIME[extname(p)] || 'application/octet-stream',
        'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
      })
      res.end(data)
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  })
  .listen(PORT, () => console.log(`Homey Dashboard — http://0.0.0.0:${PORT}/  (admin: /admin.html)`))
