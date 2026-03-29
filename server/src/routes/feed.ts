import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { getItemsForFilter, renderItem } from '../data.ts'
import { patchElements, patchSignals } from '../sse.ts'

const feed = new Hono()

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/feed?filter=all|unread|mentions
//
// Returns a Datastar SSE stream that:
//   1. Removes all existing .feed-item elements from #feed-container
//   2. Appends the filtered items one by one (so LES stagger-enter has real nodes)
//   3. Patches signals: $feedState → 'loaded', $feedItemCount → N
//
// LES side:
//   response <- @get '/api/feed' [filter: $activeFilter]
//   (the @get triggers this endpoint; Datastar processes the SSE response)
//
//   After this SSE stream closes, the LES then-chain continues:
//   then emit feed:data-ready
//   → feed:data-ready handler: call feed:enter-items (stagger-enter .feed-item)
//
// This is the clean separation:
//   Server (Datastar SSE): manages DOM nodes — add, remove, replace
//   LES: manages animation choreography — when and how nodes animate in/out
// ─────────────────────────────────────────────────────────────────────────────

feed.get('/', async (c) => {
  const filter = c.req.query('filter') ?? 'all'
  const items = getItemsForFilter(filter)

  console.log(`[feed] GET /api/feed?filter=${filter} → ${items.length} items`)

  return streamSSE(c, async (stream) => {
    // Step 1: Remove all existing feed items
    // mode: remove + selector targets every .feed-item in the container
    await stream.writeSSE({
      event: 'datastar-patch-elements',
      data: 'selector #feed-container .feed-item\nmode remove',
    })

    // Small delay so LES's stagger-exit animation has time to complete
    // before new nodes are inserted. In production this would be driven
    // by the client signaling readiness, but for the demo a fixed delay works.
    await new Promise(r => setTimeout(r, 350))

    // Step 2: Append filtered items into #feed-container
    // Each item is appended individually so they arrive as real DOM nodes
    for (const item of items) {
      const html = renderItem(item)
      await stream.writeSSE({
        event: 'datastar-patch-elements',
        data: `selector #feed-container\nmode append\nelements ${html}`,
      })
      // Small stagger delay between node insertions (purely for aesthetics —
      // LES's stagger-enter will handle the visual timing)
      await new Promise(r => setTimeout(r, 10))
    }

    // Step 3: Patch signals so Datastar's reactive graph updates
    await stream.writeSSE({
      event: 'datastar-patch-signals',
      data: JSON.stringify({ feedItemCount: items.length }),
    })

    console.log(`[feed] streamed ${items.length} items for filter="${filter}"`)
  })
})

export { feed }
