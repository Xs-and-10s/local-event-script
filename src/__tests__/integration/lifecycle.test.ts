/**
 * LocalEventScript — lifecycle integration tests.
 *
 * Tests element upgrade, parent-child tree wiring, lesReady ordering,
 * and the on-child-ready hook. All tests work against the public surface:
 * HTML structure, CustomEvents, and the lesReady Promise.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '../../index.js'  // registers all custom elements
import { makeLES, addConfig, attach, attachTree, collectEvents, nextTick } from '../helpers.js'

beforeEach(() => { document.body.innerHTML = '' })
afterEach(() => { document.body.innerHTML = '' })

describe('Custom element registration', () => {
  it('local-event-script is defined as a custom element', () => {
    expect(customElements.get('local-event-script')).toBeDefined()
  })

  it('on-event, on-load, local-command are defined', () => {
    expect(customElements.get('on-event')).toBeDefined()
    expect(customElements.get('on-load')).toBeDefined()
    expect(customElements.get('local-command')).toBeDefined()
  })
})

describe('lesReady promise', () => {
  it('resolves after the element initializes', async () => {
    const el = makeLES('root')
    document.body.appendChild(el)
    await expect((el as any).lesReady).resolves.toBeUndefined()
  })

  it('resolves only once (not multiple times)', async () => {
    const el = makeLES('root')
    document.body.appendChild(el)
    const p1 = (el as any).lesReady
    const p2 = (el as any).lesReady
    expect(p1).toBe(p2)  // same Promise object
    await p1
  })

  it('resolves before the ready console.log fires', async () => {
    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })
    const el = makeLES('root')
    document.body.appendChild(el)
    await (el as any).lesReady
    expect(logs.some(l => l.includes('[LES] ready:'))).toBe(true)
    vi.restoreAllMocks()
  })
})

describe('Parent-child tree registration', () => {
  it('child registers with parent synchronously before init runs', async () => {
    const parent = makeLES('parent')
    const child  = makeLES('child')
    parent.appendChild(child)

    document.body.appendChild(parent)
    // After the microtask, _lesParent should be wired
    await nextTick()
    expect((child as any)._lesParent).toBe(parent)
  })

  it('parent._lesChildren contains child', async () => {
    const parent = makeLES('parent')
    const child  = makeLES('child')
    parent.appendChild(child)

    document.body.appendChild(parent)
    await nextTick()
    expect((parent as any)._lesChildren.has(child)).toBe(true)
  })

  it('disconnectedCallback removes child from parent._lesChildren', async () => {
    const parent = makeLES('parent')
    const child  = makeLES('child')
    parent.appendChild(child)
    await attachTree(parent)

    child.remove()
    await nextTick()
    expect((parent as any)._lesChildren.has(child)).toBe(false)
  })

  it('child._lesParent is null after removal', async () => {
    const parent = makeLES('parent')
    const child  = makeLES('child')
    parent.appendChild(child)
    await attachTree(parent)

    child.remove()
    await nextTick()
    expect((child as any)._lesParent).toBeNull()
  })
})

describe('Bottom-up initialization order', () => {
  it('child on-load fires before parent on-load', async () => {
    const order: string[] = []

    const parent = makeLES('parent')
    const child  = makeLES('child')

    // Track order via events
    const parentFired = new Promise<void>(resolve => {
      document.addEventListener('parent-loaded', () => { order.push('parent'); resolve() }, { once: true })
    })
    const childFired = new Promise<void>(resolve => {
      document.addEventListener('child-loaded', () => { order.push('child'); resolve() }, { once: true })
    })

    addConfig(parent, 'on-load', { run: '`broadcast parent-loaded`' })
    addConfig(child,  'on-load', { run: '`broadcast child-loaded`' })
    parent.appendChild(child)

    document.body.appendChild(parent)
    await Promise.all([parentFired, childFired])

    expect(order[0]).toBe('child')
    expect(order[1]).toBe('parent')
  })

  it('four children all fire on-load before parent on-load', async () => {
    const order: string[] = []
    const parent = makeLES('parent')

    const waits: Promise<void>[] = []
    ;['a', 'b', 'c', 'd'].forEach(id => {
      const child = makeLES(id)
      addConfig(child, 'on-load', { run: `\`broadcast child-${id}\`` })
      parent.appendChild(child)
      waits.push(new Promise<void>(resolve =>
        document.addEventListener(`child-${id}`, () => { order.push(id); resolve() }, { once: true })
      ))
    })

    addConfig(parent, 'on-load', { run: '`broadcast parent-done`' })
    waits.push(new Promise<void>(resolve =>
      document.addEventListener('parent-done', () => { order.push('parent'); resolve() }, { once: true })
    ))

    document.body.appendChild(parent)
    await Promise.all(waits)

    expect(order[order.length - 1]).toBe('parent')
    expect(order.slice(0, -1)).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']))
  })
})

describe('les:child-ready event', () => {
  it('fires on the parent element when a child is ready', async () => {
    const parent = makeLES('parent')
    const child  = makeLES('child-X')
    parent.appendChild(child)

    const events = collectEvents(parent, 'les:child-ready')
    document.body.appendChild(parent)
    await (parent as any).lesReady

    expect(events.length).toBeGreaterThanOrEqual(1)
  })

  it('payload[0] is the child element id', async () => {
    const parent = makeLES('parent')
    const child  = makeLES('my-child')
    parent.appendChild(child)

    const events = collectEvents(parent, 'les:child-ready')
    document.body.appendChild(parent)
    await (parent as any).lesReady

    const childReadyEvent = events.find(e => e.detail?.payload?.[0] === 'my-child')
    expect(childReadyEvent).toBeDefined()
  })

  it('fires once per child — four children → four events', async () => {
    const parent = makeLES('parent')
    ;['c1', 'c2', 'c3', 'c4'].forEach(id => parent.appendChild(makeLES(id)))

    const events = collectEvents(parent, 'les:child-ready')
    document.body.appendChild(parent)
    await (parent as any).lesReady

    expect(events).toHaveLength(4)
  })

  it('does NOT bubble to document (is a host-element-only event)', async () => {
    const parent = makeLES('parent')
    parent.appendChild(makeLES('child'))

    const docEvents = collectEvents(document, 'les:child-ready')
    document.body.appendChild(parent)
    await (parent as any).lesReady

    expect(docEvents).toHaveLength(0)
  })
})
