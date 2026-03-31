import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { feed } from './routes/feed.ts'
import { form } from './routes/form.ts'
import { d3, logD3KeyStatus } from './routes/d3.ts'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'node:process'

// Load .env manually as a fallback for when --env-file is not passed.
// When using `npm run dev:server` the --env-file=.env flag handles this
// before any module code runs (avoiding ESM import-hoisting issues).
// This block covers direct `node src/index.ts` invocations.
try {
  const { readFileSync } = await import('node:fs')
  const envPath = new URL('../.env', import.meta.url)
  const envText = readFileSync(envPath, 'utf-8')
  for (const line of envText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    // Only set if not already set AND value is non-empty
    if (key && val && !(key in process.env)) {
      process.env[key] = val
    }
  }
} catch {
  // .env not present — keys come from actual env or are absent (graceful)
}

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..', '..')   // local-event-script/

const app = new Hono()

// ─── API routes ───────────────────────────────────────────────────────────────
app.route('/api/feed',     feed)
app.route('/api/form',     form)
app.route('/api/d3',       d3)

// ─── Demo page routes ─────────────────────────────────────────────────────────
const DEMO_PAGES: Record<string, string> = {
  '/feed':   'feed.html',
  '/splash': 'splash.html',
  '/scroll': 'scroll.html',
  '/cards':  'cards.html',
  '/form':   'form.html',
  '/d3':     'd3.html',     // "Living Map" — earthquakes, wind & fire
}

for (const [route, file] of Object.entries(DEMO_PAGES)) {
  app.get(route, async (c) => {
    try {
      const html = await readFile(join(ROOT, file), 'utf-8')
      return c.html(html)
    } catch {
      return c.html(comingSoonPage(route, file))
    }
  })
}

// ─── Static files ─────────────────────────────────────────────────────────────
app.use('/*', serveStatic({ root: ROOT }))

// ─── Dev startup ──────────────────────────────────────────────────────────────
const PORT = 3000

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(``)
  console.log(`  ┌──────────────────────────────────────────────────────┐`)
  console.log(`  │  local-event-script dev server                        │`)
  console.log(`  │  http://localhost:${PORT}                              │`)
  console.log(`  │                                                        │`)
  console.log(`  │  /          gallery (index.html)                       │`)
  console.log(`  │  /feed      activity feed demo                         │`)
  console.log(`  │  /splash    splash screen demo                         │`)
  console.log(`  │  /scroll    scroll reveal demo                         │`)
  console.log(`  │  /cards     card interactions demo                     │`)
  console.log(`  │  /form      form choreography demo                     │`)
  console.log(`  │  /d3        living map — earthquakes, wind & fire      │`)
  console.log(`  │                                                        │`)
  console.log(`  │  API:  GET  /api/feed?filter=all|unread|mentions       │`)
  console.log(`  │        POST /api/form                                  │`)
  console.log(`  │        GET  /api/d3/earthquakes                        │`)
  console.log(`  │        GET  /api/d3/weather                            │`)
  console.log(`  │        GET  /api/d3/fires                              │`)
  console.log(`  │        GET  /api/d3/flights                            │`)
  console.log(`  │        GET  /api/d3/presence  (SSE)                   │`)
  console.log(`  │        POST /api/d3/presence                           │`)
  console.log(`  │                                                        │`)
  logD3KeyStatus()
  console.log(`  └──────────────────────────────────────────────────────┘`)
  console.log(``)
})

// ─── Coming-soon placeholder ──────────────────────────────────────────────────

function comingSoonPage(route: string, file: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coming soon — ${route}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f1117; color: #e2e4ec;
           display: flex; flex-direction: column; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; gap: 1rem; }
    h1 { font-size: 1.4rem; font-weight: 500; }
    p  { color: #6b7280; font-size: 0.9rem; font-family: monospace; }
    a  { color: #7c6cf7; text-decoration: none; font-size: 0.875rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Coming soon</h1>
  <p>${file} has not been created yet</p>
  <a href="/">← back to demos</a>
</body>
</html>`
}
