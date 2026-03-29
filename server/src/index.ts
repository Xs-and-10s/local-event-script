import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { feed } from './routes/feed.ts'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────────
// Resolve paths relative to the repo root (one level up from server/)
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..', '..')   // local-event-script/

const app = new Hono()

// ─── API routes ───────────────────────────────────────────────────────────────
app.route('/api/feed', feed)

// ─── Static files ─────────────────────────────────────────────────────────────
// Serve everything from the repo root:
//   /dist/local-event-script.js       ← esbuild output
//   /scroll-effects.js                ← userland module stub
//   /spring-physics.js                ← userland module stub
//   /index.html                       ← demo page

app.use('/*', serveStatic({ root: ROOT }))

// ─── Dev info ─────────────────────────────────────────────────────────────────
const PORT = 3000

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n  ┌─────────────────────────────────────────────┐`)
  console.log(`  │  local-event-script dev server               │`)
  console.log(`  │  http://localhost:${PORT}                       │`)
  console.log(`  │                                               │`)
  console.log(`  │  API:  GET /api/feed?filter=all|unread|...   │`)
  console.log(`  │  LES:  rebuild → node esbuild.dev.mjs        │`)
  console.log(`  └─────────────────────────────────────────────┘\n`)
})
