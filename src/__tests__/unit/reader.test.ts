/**
 * readConfig — unit tests.
 *
 * Tests that the DOM reader correctly classifies child elements into:
 *   - Known config elements (pushed into config fields)
 *   - Deferred elements (silently accepted — local-event-script, local-bridge)
 *   - Unknown elements (warn if hyphenated, silent if plain HTML)
 *
 * Uses happy-dom (default environment) for createElement.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readConfig } from '@parser/reader.js'

function host(innerHTML = ''): Element {
  const el = document.createElement('local-event-script')
  el.id = 'test-host'
  el.innerHTML = innerHTML
  return el
}

describe('readConfig — empty host', () => {
  it('returns an empty config with the correct id', () => {
    const cfg = readConfig(host())
    expect(cfg.id).toBe('test-host')
    expect(cfg.commands).toHaveLength(0)
    expect(cfg.onEvent).toHaveLength(0)
    expect(cfg.modules).toHaveLength(0)
  })
})

describe('readConfig — valid config elements', () => {
  it('reads <use-module type="bridge">', () => {
    const cfg = readConfig(host('<use-module type="bridge"></use-module>'))
    expect(cfg.modules).toHaveLength(1)
    expect(cfg.modules[0]!.type).toBe('bridge')
  })

  it('reads <local-command>', () => {
    const cfg = readConfig(host('<local-command name="go" do="`emit go`"></local-command>'))
    expect(cfg.commands).toHaveLength(1)
    expect(cfg.commands[0]!.name).toBe('go')
  })

  it('reads <on-event>', () => {
    const cfg = readConfig(host('<on-event name="data:loaded" handle="`emit done`"></on-event>'))
    expect(cfg.onEvent).toHaveLength(1)
    expect(cfg.onEvent[0]!.name).toBe('data:loaded')
  })

  it('reads <on-signal>', () => {
    const cfg = readConfig(host('<on-signal name="$count" handle="`emit changed`"></on-signal>'))
    expect(cfg.onSignal).toHaveLength(1)
    expect(cfg.onSignal[0]!.name).toBe('$count')
  })

  it('reads <on-load>', () => {
    const cfg = readConfig(host('<on-load run="`emit init`"></on-load>'))
    expect(cfg.onLoad).toHaveLength(1)
  })

  it('reads <on-enter>', () => {
    const cfg = readConfig(host('<on-enter run="`emit entered`"></on-enter>'))
    expect(cfg.onEnter).toHaveLength(1)
  })

  it('reads <on-exit>', () => {
    const cfg = readConfig(host('<on-exit run="`emit exited`"></on-exit>'))
    expect(cfg.onExit).toHaveLength(1)
  })

  it('reads multiple children of mixed types', () => {
    const cfg = readConfig(host(`
      <local-command name="a" do="\`emit a\`"></local-command>
      <local-command name="b" do="\`emit b\`"></local-command>
      <on-event name="x:done" handle="\`emit handled\`"></on-event>
    `))
    expect(cfg.commands).toHaveLength(2)
    expect(cfg.onEvent).toHaveLength(1)
  })
})

describe('readConfig — deferred elements (no warning)', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  afterEach(() => { vi.restoreAllMocks() })

  it('silently ignores <local-event-script> children', () => {
    const cfg = readConfig(host('<local-event-script id="child"></local-event-script>'))
    // Not in any config array and no warning
    expect(cfg.commands).toHaveLength(0)
    expect(cfg.onEvent).toHaveLength(0)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('silently ignores <local-bridge> children', () => {
    const cfg = readConfig(host('<local-bridge name="fn" fn="window.fn"></local-bridge>'))
    expect(cfg.commands).toHaveLength(0)
    expect(console.warn).not.toHaveBeenCalled()
  })
})

describe('readConfig — unknown elements', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  afterEach(() => { vi.restoreAllMocks() })

  it('warns for unknown hyphenated custom element names', () => {
    readConfig(host('<typo-event name="x"></typo-event>'))
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('typo-event'),
      expect.anything()
    )
  })

  it('warning message lists valid config children', () => {
    readConfig(host('<typo-event name="x"></typo-event>'))
    const warnArg: string = (console.warn as any).mock.calls[0][0]
    expect(warnArg).toContain('<local-command>')
    expect(warnArg).toContain('<on-event>')
    expect(warnArg).toContain('<on-load>')
  })

  it('warning message mentions deferred elements', () => {
    readConfig(host('<typo-event name="x"></typo-event>'))
    const warnArg: string = (console.warn as any).mock.calls[0][0]
    expect(warnArg).toContain('<local-event-script>')
    expect(warnArg).toContain('<local-bridge>')
  })

  it('does NOT warn for plain HTML elements (div, p, span)', () => {
    readConfig(host('<div></div><p>text</p><span></span>'))
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('collects unknown elements in config.unknown', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const cfg = readConfig(host('<typo-event name="x"></typo-event>'))
    expect(cfg.unknown).toHaveLength(1)
  })
})

describe('readConfig — attribute validation warnings', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  afterEach(() => { vi.restoreAllMocks() })

  it('warns if <local-command> is missing name=', () => {
    readConfig(host('<local-command do="`emit x`"></local-command>'))
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('name='), expect.anything())
  })

  it('warns if <local-command> is missing do=', () => {
    readConfig(host('<local-command name="cmd"></local-command>'))
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('do='), expect.anything())
  })

  it('warns if <on-event> is missing name=', () => {
    readConfig(host('<on-event handle="`emit x`"></on-event>'))
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('name='), expect.anything())
  })

  it('warns if <on-load> is missing run=', () => {
    readConfig(host('<on-load></on-load>'))
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('run='), expect.anything())
  })
})
