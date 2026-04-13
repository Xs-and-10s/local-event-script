import { CommandRegistry } from '@runtime/registry.js'
import { ModuleRegistry, loadModule } from '@modules/types.js'
import { readConfig, logConfig } from '@parser/reader.js'
import { parseLES } from '@parser/index.js'
import { buildContext, registerCommands, wireEventHandlers, fireOnLoad, type ParsedWiring } from '@runtime/wiring.js'
import { wireIntersectionObserver } from '@runtime/observer.js'
import { notifySignalWatchers, wireSignalWatcherViaDatastar } from '@runtime/signals.js'
import type { LESConfig } from '@parser/config.js'
import type { LESNode } from '@parser/ast.js'
import type { LESContext } from '@runtime/executor.js'

export class LocalEventScript extends HTMLElement {
  readonly commands = new CommandRegistry()
  readonly modules  = new ModuleRegistry()

  private _config:  LESConfig | null  = null
  private _wiring:  ParsedWiring | null = null
  private _ctx:     LESContext | null = null

  // Cleanup fns accumulated during _init — all called in _teardown
  private _cleanups: Array<() => void> = []

  // Simple fallback signal store (Datastar bridge replaces reads/writes in Phase 6)
  private _signals: Map<string, unknown> = new Map()

  // Datastar bridge (populated in Phase 6 via attribute plugin)
  private _dsEffect: ((fn: () => void) => void) | undefined = undefined
  private _dsSignal: (<T>(name: string, init?: T) => { value: T }) | undefined = undefined

  // ── Pre-init event queue ──────────────────────────────────────────────────
  // Events fired via fire() before _init() completes wiring are queued here
  // and replayed immediately after wireEventHandlers() runs. This prevents
  // events from being silently dropped during the startup window.
  private _preInitQueue: Array<{ event: string; payload: unknown[] }> = []
  private _initComplete = false

  // ── Phase 2: LES tree wiring ───────────────────────────────────────────────
  // Parent reference set synchronously in connectedCallback (before microtask)
  // so the parent's _init() sees this child in _lesChildren when it runs.
  // Public so wiring.ts can traverse the tree for bubble/cascade without importing
  // LocalEventScript (which would create a circular module dependency).
  public _lesParent: LocalEventScript | null = null
  public _lesChildren: Set<LocalEventScript> = new Set()

  // Resolves when _init() completes (including children's lesReady).
  // Parent's _init() awaits this before firing its own on-load, creating
  // bottom-up initialization: leaves fire on-load first, root fires last.
  public readonly lesReady: Promise<void>
  private _resolveReady!: () => void

  constructor() {
    super()
    this.lesReady = new Promise<void>(resolve => { this._resolveReady = resolve })
    // Ensure LESBridge exists globally for the `forward` primitive.
    // Idempotent: no-op if already set (e.g., by bridge module or user script).
    if (!('LESBridge' in globalThis)) {
      ;(globalThis as any).LESBridge = new Map<string, (...args: unknown[]) => unknown>()
    }
  }

  get config():  LESConfig | null    { return this._config }
  get wiring():  ParsedWiring | null { return this._wiring }
  get context(): LESContext | null   { return this._ctx }

  static get observedAttributes(): string[] { return [] }

  connectedCallback(): void {
    // Reset init state so a reconnected element starts fresh.
    // NOTE: _preInitQueue is intentionally NOT reset here — events fired via
    // fire() before appendChild() must survive into _init() so they can be
    // replayed after wiring. _teardown() (called on disconnect) is where the
    // queue is cleared, ensuring a clean slate on reconnection.
    this._initComplete = false
    // Synchronous parent registration — must happen before the microtask
    // so the parent's _init() sees this child in _lesChildren when it awaits
    // children's lesReady. Uses closest() which walks up the real DOM.
    const parentLES = this.parentElement?.closest('local-event-script') as LocalEventScript | null
    this._lesParent = parentLES ?? null
    parentLES?._lesChildren.add(this)

    queueMicrotask(() => this._init())
  }

  disconnectedCallback(): void {
    this._lesParent?._lesChildren.delete(this)
    this._lesParent = null
    this._teardown()
  }

  // ─── Internal lifecycle ───────────────────────────────────────────────────

  private async _init(): Promise<void> {
    console.log('[LES] <local-event-script> initializing', this.id || '(no id)')

    // Pre-seed local signal store from data-signals:* attributes.
    // The IntersectionObserver can fire before Datastar's async plugin connects,
    // so guard expressions like `$introState == 'hidden'` would evaluate to
    // `undefined == 'hidden'` → false without this pre-seeding step.
    this._seedSignalsFromAttributes()

    // Phase 1: DOM → config
    this._config = readConfig(this)
    logConfig(this._config)

    // Phase 8: load modules before parsing so primitive names resolve
    await this._loadModules(this._config)

    // Phase 2: parse body strings → AST
    this._wiring = this._parseAll(this._config)

    // Phase 4: build context, register commands, wire event handlers
    // Connect this element's CommandRegistry to the parent's so `call`
    // statements can resolve commands defined in any ancestor.
    this.commands.setParent(this._lesParent?.commands ?? null)

    this._ctx = buildContext(
      this,
      this.commands,
      this.modules,
      { get: k => this._getSignal(k), set: (k, v) => this._setSignal(k, v) }
    )

    registerCommands(this._wiring, this.commands)

    this._cleanups.push(
      wireEventHandlers(this._wiring, this, () => this._ctx!)
    )

    // Handlers are now wired — mark init complete and drain any queued events.
    // Events fired via fire() during the startup window are replayed here,
    // in arrival order, before the on-load lifecycle fires.
    this._initComplete = true
    if (this._preInitQueue.length > 0) {
      const queued = this._preInitQueue.splice(0)
      console.log(`[LES] ${this.id || '(no id)'}: draining ${queued.length} pre-init event(s)`)
      for (const { event, payload } of queued) {
        this.fire(event, payload)
      }
    }

    // Phase 5a: IntersectionObserver for on-enter / on-exit
    this._cleanups.push(
      wireIntersectionObserver(
        this,
        this._wiring.lifecycle.onEnter,
        this._wiring.lifecycle.onExit,
        () => this._ctx!
      )
    )

    // Phase 5b: signal watchers
    // If Datastar is connected use its reactive effect() system;
    // otherwise the local _setSignal path calls notifySignalWatchers directly.
    if (this._dsEffect) {
      for (const watcher of this._wiring.watchers) {
        wireSignalWatcherViaDatastar(watcher, this._dsEffect, () => this._ctx!)
      }
      console.log(`[LES] wired ${this._wiring.watchers.length} signal watchers via Datastar`)
    } else {
      console.log(`[LES] wired ${this._wiring.watchers.length} signal watchers (local fallback)`)
    }

    // Phase 6: Datastar bridge full activation — coming next

    // Register any <local-bridge> declarative bridges declared as children.
    // Runs after modules load so the bridge module has initialized LESBridge.
    this._registerLocalBridges()

    // Wait for all direct LES children to complete their _init() before
    // firing this element's on-load. Creates bottom-up initialization order:
    // leaves → intermediate nodes → root. Uses allSettled so a failing child
    // does not block the parent indefinitely.
    const childPromises = [...this._lesChildren].map(c => c.lesReady)
    if (childPromises.length > 0) {
      let _timeoutId: ReturnType<typeof setTimeout>
      const timeout = new Promise<void>(resolve => {
        _timeoutId = setTimeout(() => {
          console.warn(`[LES] ${this.id || '(no id)'}: not all children signalled ready within 3s — proceeding anyway`)
          resolve()
        }, 3000)
      })
      await Promise.race([
        Promise.allSettled(childPromises).then(() => clearTimeout(_timeoutId)),
        timeout,
      ])
    }

    // on-load fires after all children are ready
    await fireOnLoad(this._wiring, () => this._ctx!)

    // Signal readiness to our parent (it may be waiting on this)
    this._resolveReady()
    console.log('[LES] ready:', this.id || '(no id)')

    // Notify parent with les:child-ready so it can react declaratively.
    // payload[0] = this element's id, useful when parent has multiple children
    // and wants to distinguish which one became ready.
    if (this._lesParent) {
      this._lesParent.dispatchEvent(new CustomEvent('les:child-ready', {
        detail: { payload: [this.id || ''] },
        bubbles: false,
        composed: false,
      }))
    }
  }

  private _teardown(): void {
    console.log('[LES] <local-event-script> disconnected', this.id || '(no id)')
    for (const cleanup of this._cleanups) cleanup()
    this._cleanups = []
    this._config      = null
    this._wiring      = null
    this._ctx         = null
    this._initComplete = false
    this._preInitQueue = []
    // Note: _lesChildren is NOT cleared — the children are still in the DOM
    // and will re-register on their own reconnect. _lesParent is cleared in
    // disconnectedCallback before _teardown() is called.
  }

  // ─── Local bridge registration ───────────────────────────────────────────

  /**
   * Reads <local-bridge name="exitSplash" fn="window.exitSplash"> children
   * and registers them in the global LESBridge Map.
   * Called after module loading so `<use-module type="bridge">` has run first.
   */
  private _registerLocalBridges(): void {
    const registry = (globalThis as any).LESBridge as Map<string, (...args: unknown[]) => unknown> | undefined
    if (!registry) return

    for (const child of Array.from(this.children)) {
      if (child.tagName.toLowerCase() !== 'local-bridge') continue
      const name   = child.getAttribute('name')?.trim()
      const fnExpr = child.getAttribute('fn')?.trim()
      if (!name || !fnExpr) {
        console.warn('[LES] <local-bridge> requires both name= and fn= attributes', child)
        continue
      }
      // Register as a lazy wrapper: evaluate fn= expression on first call,
      // not at init time. Window functions may not yet exist during LES init.
      const capturedExpr = fnExpr
      const capturedName = name
      registry.set(name, (...args: unknown[]) => {
        try {
          // eslint-disable-next-line no-new-func
          const resolved = new Function(`return (${capturedExpr})`)()
          if (typeof resolved !== 'function') {
            console.error(`[LES:bridge] forward "${capturedName}": fn="${capturedExpr}" resolved to ${typeof resolved} — is the function defined yet?`)
            return undefined
          }
          return resolved(...args)
        } catch (err) {
          console.error(`[LES:bridge] forward "${capturedName}": fn= evaluation failed:`, err)
          return undefined
        }
      })
      console.log(`[LES:bridge] registered "${name}" (lazy)`)
    }
  }

  // ─── Signal store ─────────────────────────────────────────────────────────

  /**
   * Reads all data-signals:KEY="VALUE" attributes on the host element and
   * pre-populates the local _signals Map with their initial values.
   *
   * Datastar evaluates these as JS expressions (e.g. "'hidden'" → "hidden",
   * "0" → 0, "[]" → []). We do the same with a simple eval.
   *
   * This runs synchronously before any async operations so that the
   * IntersectionObserver — which may fire before Datastar connects — sees
   * the correct initial signal values when evaluating `when` guards.
   */
  private _seedSignalsFromAttributes(): void {
    for (const attr of Array.from(this.attributes)) {
      // Match data-signals:KEY or data-star-signals:KEY (aliased bundle)
      const m = attr.name.match(/^data-(?:star-)?signals:(.+)$/)
      if (!m) continue
      const key = m[1]!
        .replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase()) // kebab-case → camelCase
      try {
        // Evaluate the attribute value as a JS expression (same as Datastar does)
        // eslint-disable-next-line no-new-func
        const value = new Function(`return (${attr.value})`)()
        this._signals.set(key, value)
        console.log(`[LES] seeded $${key} =`, value)
      } catch {
        // If it fails, store the raw string value
        this._signals.set(key, attr.value)
        console.log(`[LES] seeded $${key} = (raw)`, attr.value)
      }
    }
  }

  private _getSignal(name: string): unknown {
    // Phase 6: prefer Datastar signal tree when bridge is connected
    if (this._dsSignal) {
      try { return this._dsSignal(name).value } catch { /* fall through */ }
    }
    // Try exact case first (e.g. Datastar-set signals are camelCase).
    // Fall back to lowercase because HTML normalizes attribute names to lowercase,
    // so data-signals:introState → seeded as "introstate", but guards reference "$introState".
    if (this._signals.has(name)) return this._signals.get(name)
    if (this._signals.has(name.toLowerCase())) return this._signals.get(name.toLowerCase())
    return undefined
  }

  private _setSignal(name: string, value: unknown): void {
    const prev = this._signals.get(name)
    this._signals.set(name, value)
    console.log(`[LES] $${name} =`, value)

    // Phase 6: write through to Datastar's reactive graph
    if (this._dsSignal) {
      try {
        const sig = this._dsSignal<unknown>(name, value)
        sig.value = value
      } catch { /* signal may not exist in Datastar yet */ }
    }

    // Phase 5b: notify local signal watchers (fallback path when Datastar absent)
    if (prev !== value && this._wiring && this._ctx && !this._dsEffect) {
      notifySignalWatchers(name, this._wiring.watchers, () => this._ctx!)
    }
  }

  // ─── Module loading ───────────────────────────────────────────────────────

  private async _loadModules(config: LESConfig): Promise<void> {
    if (config.modules.length === 0) return
    await Promise.all(
      config.modules.map(decl =>
        loadModule(this.modules, {
          ...(decl.type ? { type: decl.type } : {}),
          ...(decl.src  ? { src:  decl.src  } : {}),
        }).catch(err => console.warn('[LES] Module load failed:', err))
      )
    )
  }

  // ─── Parse all bodies ─────────────────────────────────────────────────────

  private _parseAll(config: LESConfig): ParsedWiring {
    let ok = 0, fail = 0

    const tryParse = (body: string, label: string): LESNode => {
      try { ok++; return parseLES(body) }
      catch (e) {
        fail++
        console.error(`[LES] Parse error in ${label}:`, e)
        return { type: 'expr', raw: '' }
      }
    }

    const wiring: ParsedWiring = {
      commands: config.commands.map(d => ({
        name: d.name, guard: d.guard, argsRaw: d.argsRaw,
        body: tryParse(d.body, `command "${d.name}"`),
      })),
      handlers: config.onEvent.map(d => ({
        event: d.name,
        body: tryParse(d.body, `on-event "${d.name}"`),
      })),
      watchers: config.onSignal.map(d => ({
        signal: d.name, when: d.when,
        body: tryParse(d.body, `on-signal "${d.name}"`),
      })),
      lifecycle: {
        onLoad:  config.onLoad.map(d => tryParse(d.body, 'on-load')),
        onEnter: config.onEnter.map(d => ({ when: d.when, body: tryParse(d.body, 'on-enter') })),
        onExit:  config.onExit.map(d => tryParse(d.body, 'on-exit')),
      },
    }

    const total = ok + fail
    console.log(`[LES] parser: ${ok}/${total} bodies parsed successfully${fail > 0 ? ` (${fail} errors)` : ''}`)
    return wiring
  }

  // ─── Datastar bridge ───────────────────────────────────────────────────────

  connectDatastar(fns: {
    effect: (fn: () => void) => void
    signal: <T>(name: string, init?: T) => { value: T }
  }): void {
    this._dsEffect = fns.effect
    this._dsSignal = fns.signal
    console.log('[LES] Datastar bridge connected', this.id)
  }

  disconnectDatastar(): void {
    this._dsEffect = undefined
    this._dsSignal = undefined
  }

  get dsEffect() { return this._dsEffect }
  get dsSignal()  { return this._dsSignal }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Fire a named local event into this LES instance from outside.
   *
   * If called before _init() has completed wiring (i.e. during the startup
   * window), the event is queued and replayed automatically once handlers
   * are ready. This prevents silent event drops when external code calls
   * fire() or fireLES() before the element has fully initialized.
   */
  fire(event: string, payload: unknown[] = []): void {
    if (!this._initComplete) {
      console.log(`[LES] ${this.id || '(no id)'}: queued pre-init event "${event}"`)
      this._preInitQueue.push({ event, payload })
      return
    }
    this.dispatchEvent(new CustomEvent(event, {
      detail: { payload }, bubbles: false, composed: false,
    }))
  }

  /** Call a command by name from outside (e.g. browser console, tests). */
  async call(command: string, args: Record<string, unknown> = {}): Promise<void> {
    if (!this._ctx) { console.warn('[LES] not initialized yet'); return }
    const { runCommand } = await import('@runtime/executor.js')
    await runCommand(command, args, this._ctx)
  }

  /** Read a signal value directly (for debugging). */
  signal(name: string): unknown {
    return this._getSignal(name)
  }
}

customElements.define('local-event-script', LocalEventScript)
