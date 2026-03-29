import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { feed } from './routes/feed.ts'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..', '..')   // local-event-script/

const app = new Hono()

// ─── API routes ───────────────────────────────────────────────────────────────
app.route('/api/feed', feed)

// ─── Demo page routes ─────────────────────────────────────────────────────────
// Each demo slug maps to an HTML file in the repo root.
// Add new demos here as they're created — the gallery index.html
// links to these URLs, and the server resolves them to the right file.

const DEMO_PAGES: Record<string, string> = {
  '/feed':   'feed.html',
  '/splash': 'splash.html',   // coming soon
  '/scroll': 'scroll.html',   // coming soon
  '/cards':  'cards.html',    // coming soon
  '/form':   'form.html',     // coming soon
}

for (const [route, file] of Object.entries(DEMO_PAGES)) {
  app.get(route, async (c) => {
    try {
      const html = await readFile(join(ROOT, file), 'utf-8')
      return c.html(html)
    } catch {
      // File doesn't exist yet — show a friendly placeholder
      return c.html(comingSoonPage(route, file))
    }
  })
}

// ─── Static files ─────────────────────────────────────────────────────────────
// Serves /dist/, /scroll-effects.js, /spring-physics.js, /index.html, etc.
app.use('/*', serveStatic({ root: ROOT }))

// ─── Dev startup ──────────────────────────────────────────────────────────────
const PORT = 3000

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n  ┌──────────────────────────────────────────────────┐`)
  console.log(`  │  local-event-script dev server                    │`)
  console.log(`  │  http://localhost:${PORT}                            │`)
  console.log(`  │                                                    │`)
  console.log(`  │  /          gallery (index.html)                   │`)
  console.log(`  │  /feed      activity feed demo                     │`)
  console.log(`  │  /splash    splash screen demo                      │`)
  console.log(`  │  /scroll    scroll reveal (coming soon)            │`)
  console.log(`  │  /cards     card interactions (coming soon)        │`)
  console.log(`  │  /form      form choreography (coming soon)        │`)
  console.log(`  │                                                    │`)
  console.log(`  │  API: GET /api/feed?filter=all|unread|mentions     │`)
  console.log(`  └──────────────────────────────────────────────────┘\n`)
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
