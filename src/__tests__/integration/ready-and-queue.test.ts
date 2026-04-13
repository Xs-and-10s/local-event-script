/**
 * lesReady export and pre-init event queue — integration tests.
 *
 * lesReady: a module-level Promise<void> that resolves once all LES custom
 * elements are defined. Primarily useful with dynamic import().
 *
 * Pre-init queue: events fired via fire() before _init() completes wiring
 * are queued and replayed automatically once handlers are ready. This
 * prevents silent event drops during the startup window.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { lesReady } from '../../index.js'
import '../../index.js'
import { makeLES, addConfig, collectEvents, nextTick } from '../helpers.js'

beforeEach(() => { document.body.innerHTML = '' })
afterEach(() => { document.body.innerHTML = '' })

// ── lesReady ─────────────────────────────────────────────────────────────────

describe('lesReady export', () => {
  it('is exported as a Promise', () => {
    expect(lesReady).toBeInstanceOf(Promise)
  })

  it('resolves (does not hang)', async () => {
    await expect(lesReady).resolves.toBeUndefined()
  })

  it('resolves before or at the same time as custom element definition', async () => {
    await lesReady
    // After lesReady, all LES elements must be defined
    expect(customElements.get('local-event-script')).toBeDefined()
    expect(customElements.get('on-event')).toBeDefined()
    expect(customElements.get('local-command')).toBeDefined()
    expect(customElements.get('on-load')).toBeDefined()
  })

  it('is idempotent — resolves the same way on repeated awaits', async () => {
    const v1 = await lesReady
    const v2 = await lesReady
    expect(v1).toBeUndefined()
    expect(v2).toBeUndefined()
  })
})

// ── Pre-init event queue ──────────────────────────────────────────────────────

describe('pre-init queue — via fire() before element is attached', () => {
  it('queues an event fired before the element is attached to DOM', async () => {
    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'early:event', handle: '`emit early:handled`' })

    // Fire BEFORE attaching — element exists but _init() hasn't run
    const handledBeforeAttach: CustomEvent[] = []
    el.addEventListener('early:handled', (e) => handledBeforeAttach.push(e as CustomEvent))

    ;(el as any).fire('early:event')  // should be queued, not dropped

    // Now attach — _init() runs, queue drains
    document.body.appendChild(el)
    await (el as any).lesReady
    await nextTick()

    expect(handledBeforeAttach).toHaveLength(1)
  })

  it('queues an event fired before _init() wires handlers', async () => {
    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'startup:event', handle: '`broadcast startup:heard`' })

    const docEvents = collectEvents(document, 'startup:heard')

    // Attach the element
    document.body.appendChild(el)
    // Fire immediately — _init() is queued as microtask but handlers not yet wired
    ;(el as any).fire('startup:event')

    // Wait for init to complete and queue to drain
    await (el as any).lesReady
    await nextTick()

    expect(docEvents).toHaveLength(1)
  })

  it('replays multiple queued events in arrival order', async () => {
    const el = makeLES('root')
    const order: string[] = []

    addConfig(el, 'on-event', { name: 'evt:a', handle: '`emit seq:a`' })
    addConfig(el, 'on-event', { name: 'evt:b', handle: '`emit seq:b`' })
    addConfig(el, 'on-event', { name: 'evt:c', handle: '`emit seq:c`' })

    el.addEventListener('seq:a', () => order.push('a'))
    el.addEventListener('seq:b', () => order.push('b'))
    el.addEventListener('seq:c', () => order.push('c'))

    // Queue three events before wiring
    ;(el as any).fire('evt:a')
    ;(el as any).fire('evt:b')
    ;(el as any).fire('evt:c')

    document.body.appendChild(el)
    await (el as any).lesReady
    await nextTick()

    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('passes payload through the queue correctly', async () => {
    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'data:in', handle: '`broadcast data:out [payload[0]]`' })

    const docEvents = collectEvents(document, 'data:out')

    ;(el as any).fire('data:in', ['test-payload'])
    document.body.appendChild(el)
    await (el as any).lesReady
    await nextTick()

    expect(docEvents).toHaveLength(1)
    expect(docEvents[0]!.detail.payload[0]).toBe('test-payload')
  })
})

describe('pre-init queue — events fired AFTER init complete bypass queue', () => {
  it('events fired after lesReady are NOT queued — handled immediately', async () => {
    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'post:init', handle: '`emit post:handled`' })
    document.body.appendChild(el)
    await (el as any).lesReady  // fully initialized

    const handled = collectEvents(el, 'post:handled')
    ;(el as any).fire('post:init')
    await nextTick()

    expect(handled).toHaveLength(1)
    // Queue should be empty (no pre-init events)
    expect((el as any)._preInitQueue).toHaveLength(0)
  })
})

describe('pre-init queue — lifecycle reset on reconnect', () => {
  it('queue is empty after disconnect + reconnect cycle', async () => {
    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'test:evt', handle: '`emit test:handled`' })
    document.body.appendChild(el)
    await (el as any).lesReady

    // Disconnect
    el.remove()
    await nextTick()

    // Fire an event while detached — should queue
    ;(el as any).fire('test:evt')
    expect((el as any)._preInitQueue).toHaveLength(1)

    // Reconnect — queue should drain
    const handled = collectEvents(el, 'test:handled')
    document.body.appendChild(el)
    await (el as any).lesReady
    await nextTick()

    expect((el as any)._preInitQueue).toHaveLength(0)
    expect(handled).toHaveLength(1)
  })
})

describe('pre-init queue — logging', () => {
  it('logs a console message for each queued event', async () => {
    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })

    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'quiet:event', handle: '`emit handled`' })

    ;(el as any).fire('quiet:event')

    expect(logs.some(l => l.includes('queued') && l.includes('quiet:event'))).toBe(true)

    document.body.appendChild(el)
    await (el as any).lesReady
    vi.restoreAllMocks()
  })

  it('logs a drain message when replaying queued events', async () => {
    const logs: string[] = []

    const el = makeLES('drain-test')
    addConfig(el, 'on-event', { name: 'q:event', handle: '`emit handled`' })

    ;(el as any).fire('q:event')

    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })

    document.body.appendChild(el)
    await (el as any).lesReady

    expect(logs.some(l => l.includes('draining') && l.includes('1'))).toBe(true)
    vi.restoreAllMocks()
  })
})
