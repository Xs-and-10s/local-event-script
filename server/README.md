# LES Dev Server

Hono + Node.js development server for the `local-event-script` demo.

This directory is **excluded from npm publishes** (see `.npmignore` in the root).
It exists to demonstrate how LES integrates with a real Datastar backend,
making the LES/Datastar boundary concrete and testable.

## Architecture

```
Browser
  ├── GET /            → Hono serves index.html
  ├── GET /dist/*.js   → Hono serves esbuild output
  └── GET /api/feed    → Hono streams datastar-patch-elements SSE
        ↓
        Datastar SSE consumer (in executor.ts) applies DOM patches
        ↓
        LES stagger-enter/stagger-exit animates the patched nodes
```

**Datastar owns:** which DOM nodes exist (add / remove / replace)  
**LES owns:** how and when those nodes animate (enter / exit / pulse)

## Running

Two terminals, run in parallel from the **repo root**:

```bash
# Terminal 1 — LES bundle watcher
node esbuild.dev.mjs

# Terminal 2 — Hono dev server
cd server && node --watch --experimental-strip-types src/index.ts
```

Or with `concurrently` installed:
```bash
npm run dev
```

Open **http://localhost:3000**

## API

### `GET /api/feed?filter=all|unread|mentions`

Returns a `text/event-stream` SSE response:

1. `datastar-patch-elements` — removes all `.feed-item` in `#feed-container`  
2. `datastar-patch-elements` — appends each filtered item (one event per item)  
3. `datastar-patch-signals`  — patches `{ feedItemCount: N }`

The LES `@get '/api/feed' [filter: $activeFilter]` action in `index.html`
calls this endpoint. The SSE consumer in `executor.ts` processes the events
and resolves the Promise only when the stream closes — so `then emit feed:data-ready`
fires only after all DOM patches are applied.

## Adding items

Edit `server/src/data.ts`. The `FEED_ITEMS` array and `filters` field control
which items appear for each filter value.
