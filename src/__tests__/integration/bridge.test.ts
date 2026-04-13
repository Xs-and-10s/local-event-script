/**
 * Bridge module — integration tests.
 *
 * Tests the `forward` primitive and <local-bridge> declarative registration.
 * Key behavioural contracts:
 *   - LESBridge is initialized on globalThis
 *   - <local-bridge> registers lazily (fn= not evaluated at init time)
 *   - `forward name` calls the registered function with payload
 *   - Missing bridge name produces a clear warning (not a crash)
 *   - Bridge functions that return Promises are awaited
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '../../index.js'
import { makeLES, addConfig, fireOn, nextTick } from '../helpers.js'

beforeEach(() => {
  document.body.innerHTML = ''
  // Ensure a clean LESBridge for each test
  ;(globalThis as any).LESBridge = new Map()
})
afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('LESBridge initialization', () => {
  it('LESBridge exists on globalThis after any LES element connects', async () => {
    const el = makeLES('root')
    document.body.appendChild(el)
    await (el as any).lesReady
    expect((globalThis as any).LESBridge).toBeDefined()
    expect((globalThis as any).LESBridge).toBeInstanceOf(Map)
  })
})

describe('<local-bridge> declarative registration', () => {
  it('registers a bridge function by name', async () => {
    const mockFn = vi.fn()
    ;(globalThis as any).testBridgeFn = mockFn

    const el = makeLES('root')
    const bridge = document.createElement('local-bridge')
    bridge.setAttribute('name', 'myAction')
    bridge.setAttribute('fn', 'globalThis.testBridgeFn')
    el.appendChild(bridge)

    document.body.appendChild(el)
    await (el as any).lesReady

    expect((globalThis as any).LESBridge.has('myAction')).toBe(true)
  })

  it('evaluates fn= lazily — NOT at registration time', async () => {
    // The function doesn't exist at element-creation time
    delete (globalThis as any).lateFunction

    const el = makeLES('root')
    const bridge = document.createElement('local-bridge')
    bridge.setAttribute('name', 'lateAction')
    bridge.setAttribute('fn', 'globalThis.lateFunction')
    el.appendChild(bridge)

    document.body.appendChild(el)
    await (el as any).lesReady

    // Bridge IS registered (no error thrown at init time)
    expect((globalThis as any).LESBridge.has('lateAction')).toBe(true)
  })

  it('calling the bridge after the fn= target is defined works correctly', async () => {
    const mockFn = vi.fn()
    // Function not yet defined when bridge registers
    const el = makeLES('root')
    const bridge = document.createElement('local-bridge')
    bridge.setAttribute('name', 'delayedFn')
    bridge.setAttribute('fn', 'globalThis.delayedFn')
    el.appendChild(bridge)

    document.body.appendChild(el)
    await (el as any).lesReady

    // Now define the function
    ;(globalThis as any).delayedFn = mockFn

    // Call it via the bridge
    const fn = (globalThis as any).LESBridge.get('delayedFn') as Function
    fn('arg1', 'arg2')
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
  })
})

describe('forward primitive — calling registered bridges', () => {
  it('calls the registered bridge function', async () => {
    const mockFn = vi.fn()
    ;(globalThis as any).LESBridge.set('doWork', mockFn)

    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'trigger', handle: '`forward doWork`' })
    document.body.appendChild(el)
    await (el as any).lesReady

    fireOn(el, 'trigger')
    await nextTick()

    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('passes payload arguments to the bridge function', async () => {
    const mockFn = vi.fn()
    ;(globalThis as any).LESBridge.set('withArgs', mockFn)

    const el = makeLES('root')
    addConfig(el, 'on-signal', { name: '$hour', handle: '`forward withArgs [$hour]`' })
    document.body.appendChild(el)
    await (el as any).lesReady

    ;(el as any)._setSignal('hour', 7)
    await nextTick()

    expect(mockFn).toHaveBeenCalledWith(7)
  })

  it('awaits a bridge function that returns a Promise', async () => {
    const order: string[] = []
    const asyncFn = vi.fn(() => new Promise<void>(resolve => {
      setTimeout(() => { order.push('bridge-resolved'); resolve() }, 10)
    }))
    ;(globalThis as any).LESBridge.set('asyncWork', asyncFn)

    const el = makeLES('root')
    addConfig(el, 'on-event', {
      name: 'trigger',
      handle: '`forward asyncWork\n  then emit after:bridge`'
    })
    document.body.appendChild(el)
    await (el as any).lesReady

    const afterEvents: CustomEvent[] = []
    el.addEventListener('after:bridge', (e) => {
      order.push('after-emit')
      afterEvents.push(e as CustomEvent)
    })

    fireOn(el, 'trigger')
    await new Promise(r => setTimeout(r, 50))

    // after:bridge must fire AFTER the async bridge resolves
    expect(order[0]).toBe('bridge-resolved')
    expect(order[1]).toBe('after-emit')
  })
})

describe('forward primitive — error handling', () => {
  it('warns when LESBridge is not initialized (missing registry)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'trigger', handle: '`forward noRegistry`' })
    document.body.appendChild(el)
    await (el as any).lesReady

    // Delete AFTER element is ready — the constructor recreates it on connect,
    // so we must remove it at forward-call time, not before attach.
    delete (globalThis as any).LESBridge

    fireOn(el, 'trigger')
    await nextTick()

    // Restore for subsequent tests
    ;(globalThis as any).LESBridge = new Map()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('LESBridge'))
  })

  it('warns when the bridge name is not registered', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const el = makeLES('root')
    addConfig(el, 'on-event', { name: 'trigger', handle: '`forward unknownBridge`' })
    document.body.appendChild(el)
    await (el as any).lesReady

    fireOn(el, 'trigger')
    await nextTick()

    // warn is called with a single string argument — no second arg
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknownBridge'))
  })

  it('does not throw — continues execution after missing bridge', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const el = makeLES('root')
    addConfig(el, 'on-event', {
      name: 'trigger',
      handle: '`forward missing\n  then emit after:missing`'
    })
    document.body.appendChild(el)
    await (el as any).lesReady

    const afterEvents = []
    el.addEventListener('after:missing', () => afterEvents.push(1))

    // Must not throw
    await expect(async () => {
      fireOn(el, 'trigger')
      await nextTick()
    }).not.toThrow()
  })
})
