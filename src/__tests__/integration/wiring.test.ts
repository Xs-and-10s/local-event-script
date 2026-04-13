/**
 * Event wiring — integration tests.
 *
 * Tests that the four LES event primitives (emit, broadcast, bubble, cascade)
 * and auto-relay behave correctly: correct target, correct payload,
 * no relay loops, correct scope.
 *
 * All tests fire LES statements through the declarative element API
 * (on-event handlers) to test the full pipeline: parse → execute → dispatch.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '../../index.js'
import { makeLES, addConfig, attachTree, collectEvents, fireOn, nextTick } from '../helpers.js'

beforeEach(() => { document.body.innerHTML = '' })
afterEach(() => { document.body.innerHTML = '' })

// Helper: run a single LES statement and return events captured at a target
async function runStatement(
  stmt: string,
  captureTarget: EventTarget,
  captureEvent: string,
  parentId = 'root'
): Promise<CustomEvent[]> {
  const el = makeLES(parentId)
  addConfig(el, 'on-event', { name: 'trigger', handle: `\`${stmt}\`` })
  document.body.appendChild(el)
  await (el as any).lesReady

  const events = collectEvents(captureTarget, captureEvent)
  fireOn(el, 'trigger')
  await nextTick()
  return events
}

describe('emit', () => {
  it('dispatches on the host element', async () => {
    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'trigger', handle: '`emit local:fired`' })
    document.body.appendChild(el)
    await (el as any).lesReady

    const hostEvents  = collectEvents(el, 'local:fired')
    const docEvents   = collectEvents(document, 'local:fired')
    fireOn(el, 'trigger')
    await nextTick()

    expect(hostEvents).toHaveLength(1)
    expect(docEvents).toHaveLength(0)
  })

  it('passes payload correctly', async () => {
    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'trigger', handle: '`emit local:fired [42]`' })
    document.body.appendChild(el)
    await (el as any).lesReady

    const events = collectEvents(el, 'local:fired')
    fireOn(el, 'trigger')
    await nextTick()

    expect(events[0]!.detail.payload[0]).toBe(42)
  })
})

describe('broadcast', () => {
  it('dispatches on document (not just on the host)', async () => {
    const docEvents = await runStatement('broadcast global:fired', document, 'global:fired')
    expect(docEvents).toHaveLength(1)
  })

  it('is received by a different LES element on the same page', async () => {
    const sender   = makeLES('sender')
    const receiver = makeLES('receiver')
    addConfig(sender, 'on-event', { name: 'trigger', handle: '`broadcast shared:event`' })
    addConfig(receiver, 'on-event', { name: 'shared:event', handle: '`emit receiver:heard`' })

    document.body.appendChild(sender)
    document.body.appendChild(receiver)
    await (sender as any).lesReady
    await (receiver as any).lesReady

    const heard = collectEvents(receiver, 'receiver:heard')
    fireOn(sender, 'trigger')
    await nextTick()

    expect(heard).toHaveLength(1)
  })

  it('does NOT cause a relay loop when the broadcaster also has an on-event for the same name', async () => {
    const el = makeLES('root')
    // On trigger → broadcast loop:attempt
    // On loop:attempt → broadcast loop:attempt (would loop without prevention)
    addConfig(el, 'on-event', { name: 'trigger',      handle: '`broadcast loop:attempt`' })
    addConfig(el, 'on-event', { name: 'loop:attempt', handle: '`broadcast loop:attempt`' })
    document.body.appendChild(el)
    await (el as any).lesReady

    const docEvents = collectEvents(document, 'loop:attempt')
    fireOn(el, 'trigger')
    await nextTick()

    // Dispatch sequence:
    //   1. trigger handler → broadcast loop:attempt (__broadcastTrigger: 'trigger')
    //      → docListener sees trigger ≠ loop:attempt → FIRES loop:attempt handler
    //   2. loop:attempt handler → broadcast loop:attempt (__broadcastTrigger: 'loop:attempt')
    //      → docListener sees same-origin + same-trigger → BLOCKED
    // Correct finite bound is exactly 2, not infinite.
    expect(docEvents.length).toBe(2)
  })
})

describe('bubble', () => {
  it('dispatches on the parent LES element, not on document', async () => {
    const parent = makeLES('parent')
    const child  = makeLES('child')
    addConfig(child, 'on-event', { name: 'trigger', handle: '`bubble up:event`' })
    addConfig(parent, 'on-event', { name: 'up:event', handle: '`emit parent:heard`' })
    parent.appendChild(child)

    await attachTree(parent)

    const parentHeard = collectEvents(parent, 'parent:heard')
    const docEvents   = collectEvents(document, 'up:event')
    fireOn(child, 'trigger')
    await nextTick()

    expect(parentHeard).toHaveLength(1)
    expect(docEvents).toHaveLength(0)
  })

  it('propagates through ALL ancestors, not just the immediate parent', async () => {
    const root   = makeLES('root')
    const mid    = makeLES('mid')
    const leaf   = makeLES('leaf')
    addConfig(leaf, 'on-event', { name: 'trigger', handle: '`bubble deep:event`' })
    addConfig(mid,  'on-event', { name: 'deep:event', handle: '`emit mid:heard`' })
    addConfig(root, 'on-event', { name: 'deep:event', handle: '`emit root:heard`' })
    mid.appendChild(leaf)
    root.appendChild(mid)

    await attachTree(root)

    const midHeard  = collectEvents(mid, 'mid:heard')
    const rootHeard = collectEvents(root, 'root:heard')
    fireOn(leaf, 'trigger')
    await nextTick()

    expect(midHeard).toHaveLength(1)
    expect(rootHeard).toHaveLength(1)
  })

  it('carries payload up the chain', async () => {
    const parent = makeLES('parent')
    const child  = makeLES('child')
    addConfig(child, 'on-event', { name: 'trigger', handle: '`bubble up:val [99]`' })
    parent.appendChild(child)
    await attachTree(parent)

    const events = collectEvents(parent, 'up:val')
    fireOn(child, 'trigger')
    await nextTick()

    expect(events[0]!.detail.payload[0]).toBe(99)
  })
})

describe('auto-relay', () => {
  it('re-broadcasts a bubble to document when ancestor has auto-relay', async () => {
    const parent = makeLES('parent')
    parent.setAttribute('auto-relay', '')
    const child = makeLES('child')
    addConfig(child, 'on-event', { name: 'trigger', handle: '`bubble child:work`' })
    parent.appendChild(child)

    await attachTree(parent)

    const docEvents = collectEvents(document, 'child:work')
    fireOn(child, 'trigger')
    await nextTick()

    expect(docEvents).toHaveLength(1)
  })

  it('auto-relay does NOT double-handle on the relay ancestor itself', async () => {
    const parent = makeLES('parent')
    parent.setAttribute('auto-relay', '')
    const child = makeLES('child')
    addConfig(child, 'on-event', { name: 'trigger', handle: '`bubble relayed:event`' })
    addConfig(parent, 'on-event', { name: 'relayed:event', handle: '`emit parent:counted`' })
    parent.appendChild(child)

    await attachTree(parent)

    const counted = collectEvents(parent, 'parent:counted')
    fireOn(child, 'trigger')
    await nextTick()

    // Parent's on-event fires once (from hostListener).
    // The auto-relay broadcast on document must NOT trigger parent's docListener again.
    expect(counted).toHaveLength(1)
  })

  it('without auto-relay, bubbles do NOT reach document', async () => {
    const parent = makeLES('parent')  // no auto-relay attribute
    const child  = makeLES('child')
    addConfig(child, 'on-event', { name: 'trigger', handle: '`bubble silent:event`' })
    parent.appendChild(child)

    await attachTree(parent)

    const docEvents = collectEvents(document, 'silent:event')
    fireOn(child, 'trigger')
    await nextTick()

    expect(docEvents).toHaveLength(0)
  })
})

describe('cascade', () => {
  it('dispatches on all direct children', async () => {
    const parent = makeLES('parent')
    const c1 = makeLES('c1')
    const c2 = makeLES('c2')
    addConfig(parent, 'on-event', { name: 'trigger', handle: '`cascade down:event`' })
    addConfig(c1, 'on-event', { name: 'down:event', handle: '`emit c1:heard`' })
    addConfig(c2, 'on-event', { name: 'down:event', handle: '`emit c2:heard`' })
    parent.appendChild(c1)
    parent.appendChild(c2)

    await attachTree(parent)

    const h1 = collectEvents(c1, 'c1:heard')
    const h2 = collectEvents(c2, 'c2:heard')
    fireOn(parent, 'trigger')
    await nextTick()

    expect(h1).toHaveLength(1)
    expect(h2).toHaveLength(1)
  })

  it('reaches grandchildren (DFS — all descendants)', async () => {
    const root  = makeLES('root')
    const mid   = makeLES('mid')
    const leaf  = makeLES('leaf')
    addConfig(root,  'on-event', { name: 'trigger', handle: '`cascade deep:down`' })
    addConfig(mid,   'on-event', { name: 'deep:down', handle: '`emit mid:heard`' })
    addConfig(leaf,  'on-event', { name: 'deep:down', handle: '`emit leaf:heard`' })
    mid.appendChild(leaf)
    root.appendChild(mid)

    await attachTree(root)

    const midH  = collectEvents(mid, 'mid:heard')
    const leafH = collectEvents(leaf, 'leaf:heard')
    fireOn(root, 'trigger')
    await nextTick()

    expect(midH).toHaveLength(1)
    expect(leafH).toHaveLength(1)
  })

  it('does NOT dispatch on document', async () => {
    const parent = makeLES('parent')
    const child  = makeLES('child')
    addConfig(parent, 'on-event', { name: 'trigger', handle: '`cascade tree:only`' })
    parent.appendChild(child)

    await attachTree(parent)

    const docEvents = collectEvents(document, 'tree:only')
    fireOn(parent, 'trigger')
    await nextTick()

    expect(docEvents).toHaveLength(0)
  })
})

describe('on-signal watcher', () => {
  it('fires when the signal changes via the JS API', async () => {
    const el = makeLES('root')
    addConfig(el, 'on-signal', { name: '$count', handle: '`emit count:changed`' })
    document.body.appendChild(el)
    await (el as any).lesReady

    const events = collectEvents(el, 'count:changed')
    ;(el as any).signal // verify signal exists
    ;(el as any)._setSignal('count', 42)
    await nextTick()

    expect(events.length).toBeGreaterThanOrEqual(1)
  })
})
