import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { handleApi } from './server/api.js'

const STATE_FILE = resolve('data/state.json')
const readState = () => (existsSync(STATE_FILE) ? readFileSync(STATE_FILE, 'utf8') : '')
const writeState = (s) => {
  mkdirSync(resolve('data'), { recursive: true })
  writeFileSync(STATE_FILE, s)
}

// Dev/preview alatt a /api/state végpont kiszolgálása (fájlba menti az állapotot).
function stateApi() {
  const mw = (req, res, next) => {
    // Külső API-k (BKK, MOHU) — ugyanaz a modul, mint a produkciós server.js-ben
    if (handleApi(req, res)) return

    if (!req.url || !req.url.startsWith('/api/state')) return next()
    if (req.method === 'GET') {
      res.setHeader('content-type', 'application/json')
      res.end(readState() || 'null')
      return
    }
    if (req.method === 'PUT') {
      let b = ''
      req.on('data', (c) => (b += c))
      req.on('end', () => {
        try {
          writeState(b)
          res.statusCode = 204
        } catch (e) {
          res.statusCode = 500
        }
        res.end()
      })
      return
    }
    next()
  }
  return {
    name: 'state-api',
    configureServer(s) {
      s.middlewares.use(mw)
    },
    configurePreviewServer(s) {
      s.middlewares.use(mw)
    },
  }
}

export default defineConfig({
  plugins: [svelte(), stateApi()],
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        admin: resolve('admin.html'),
      },
    },
  },
})
