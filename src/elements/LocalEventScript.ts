import { CommandRegistry } from '@runtime/registry.js'
import { ModuleRegistry, loadModule } from '@modules/types.js'
import { readConfig, logConfig } from '@parser/reader.js'
import { parseLES } from '@parser/index.js'
import { buildContext } from '@runtime/wiring.js'
import {
  registerCommands, wireEventHandlers, fireOnLoad,
  type ParsedWiring,
} from '@runtime/wiring.js'
import type { LESConfig } from '@parser/config.js'
import type { LESNode } from '@parser/ast.js'
import type { LESContext } from '@runtime/executor.js'

export class LocalEventScript extends HTMLElement {
  readonly commands = new CommandRegistry()
  readonly modules  = new ModuleRegistry()

  private _config:  LESConfig | null = null
  private _wiring:  ParsedWiring | null = null
  private _ctx:     LESContext | null = null
  private _cleanup: (() => void) | null = null

  // ─── Simple fallback signal store (replaced by Datastar bridge in Phase 6) ─
  private _signals: Map<string, unknown> = new Map()

  // ─── Datastar bridge ───────────────────────────────────────────────────────
  private _dsEffect: ((fn: () => void) => void) | undefined = undefined
  private _dsSignal: (<T>(name: string, init?: T) => { value: T }) | undefined = undefined

  get config():  LESConfig | null  { return this._config }
  get wiring():  ParsedWiring | null { return this._wiring }
  get context(): LESContext | null { return this._ctx }

  static get observedAttributes(): string[] { return [] }

  connectedCallback(): void {
    queueMicrotask(() => this._init())
  }

  disconnectedCallback(): void {
    this._teardown()
  }

  // ─── Internal lifecycle ───────────────────────────────────────────────────

  private async _init(): Promise<void> {
    console.log('[LES] <local-event-script> initializing', this.id || '(no id)')

    // Phase 1: DOM → config
    this._config = readConfig(this)
    logConfig(this._config)

    // Phase 8: load modules (do this before parsing so primitive names resolve)
    await this._loadModules(this._config)

    // Phase 2: parse body strings → AST
    this._wiring = this._parseAll(this._config)

    // Phase 4: build context + register commands + wire event handlers
    this._ctx = buildContext(
      this,
      this.commands,
      this.modules,
      {
        get: (k) => this._getSignal(k),
        set: (k, v) => this._setSignal(k, v),
      }
    )

    registerCommands(this._wiring, this.commands)

    this._cleanup = wireEventHandlers(
      this._wiring,
      this,
      () => this._ctx!
    )

    // Phase 5: IntersectionObserver (on-enter / on-exit) — coming next
    // Phase 6: Datastar signal watchers (on-signal) — coming after IO

    // Fire on-load last — everything else must be wired first
    await fireOnLoad(this._wiring, () => this._ctx!)

    console.log('[LES] ready:', this.id || '(no id)')
  }

  private _teardown(): void {
    console.log('[LES] <local-event-script> disconnected', this.id || '(no id)')
    this._cleanup?.()
    this._cleanup = null
    this._config  = null
    this._wiring  = null
    this._ctx     = null
  }

  // ─── Signal store ─────────────────────────────────────────────────────────

  private _getSignal(name: string): unknown {
    // Phase 6: if Datastar is connected, read from its signal store
    if (this._dsSignal) {
      try {
        return this._dsSignal(name).value
      } catch { /* fall through to local store */ }
    }
    return this._signals.get(name)
  }

  private _setSignal(name: string, value: unknown): void {
    const prev = this._signals.get(name)
    this._signals.set(name, value)
    console.log(`[LES] $${name} =`, value)
    // Phase 6: propagate to Datastar signal tree
    // Phase 5: notify on-signal watchers
    if (prev !== value) {
      this._notifySignalWatchers(name, value)
    }
  }

  private _notifySignalWatchers(name: string, _value: unknown): void {
    // Phase 5: check each on-signal watcher's when guard and execute if it passes
    // Stubbed here — Phase 5 fills this in
  }

  // ─── Module loading ───────────────────────────────────────────────────────

  private async _loadModules(config: LESConfig): Promise<void> {
    const moduleDecls = config.modules
    if (moduleDecls.length === 0) return

    await Promise.all(
      moduleDecls.map(decl =>
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
      catch (e) { fail++; console.error(`[LES] Parse error in ${label}:`, e); return { type: 'expr', raw: '' } }
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

  /** Public API: fire a named event into this LES instance from outside */
  fire(event: string, payload: unknown[] = []): void {
    this.dispatchEvent(new CustomEvent(event, {
      detail: { payload }, bubbles: false, composed: false,
    }))
  }

  /** Public API: call a command from outside (e.g. from browser console) */
  async call(command: string, args: Record<string, unknown> = {}): Promise<void> {
    if (!this._ctx) { console.warn('[LES] not initialized yet'); return }
    const { runCommand } = await import('@runtime/executor.js')
    await runCommand(command, args, this._ctx)
  }
}

customElements.define('local-event-script', LocalEventScript)
