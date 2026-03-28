import { CommandRegistry } from '@runtime/registry.js'
import { ModuleRegistry } from '@modules/types.js'
import { readConfig, logConfig } from '@parser/reader.js'
import { parseLES } from '@parser/index.js'
import type { LESConfig } from '@parser/config.js'
import type { LESNode } from '@parser/ast.js'

/**
 * <local-event-script> — the host custom element.
 *
 * Responsibilities (built up across phases):
 *   Phase 0  Register as custom element, expose typed attribute API
 *   Phase 1  Walk children → build LESConfig, log structured output
 *   Phase 2  Parse all LES body strings → AST  ← current
 *   Phase 3  Run the executor
 *   Phase 4  Wire command registry + event listeners
 *   Phase 5  Attach IntersectionObserver for on-enter / on-exit
 *   Phase 6  Connect Datastar plugin (effect, signal)
 *   Phase 7  Activate animation module
 *   Phase 8  Load <use-module> entries
 */

/** Parsed command: config decl + its compiled AST body */
interface ParsedCommand {
  name: string
  guard: string | null
  argsRaw: string
  body: LESNode
}

/** Parsed event handler: event name + compiled AST handle body */
interface ParsedEventHandler {
  event: string
  body: LESNode
}

/** Parsed signal watcher: signal name + guard + compiled AST handle body */
interface ParsedSignalWatcher {
  signal: string
  when: string | null
  body: LESNode
}

export class LocalEventScript extends HTMLElement {
  // ─── Public registries (other elements attach to these) ───────────────────
  readonly commands = new CommandRegistry()
  readonly modules  = new ModuleRegistry()

  // ─── Phase 1: raw config ──────────────────────────────────────────────────
  private _config: LESConfig | null = null
  get config(): LESConfig | null { return this._config }

  // ─── Phase 2: parsed ASTs ─────────────────────────────────────────────────
  private _parsedCommands:  ParsedCommand[]        = []
  private _parsedHandlers:  ParsedEventHandler[]   = []
  private _parsedWatchers:  ParsedSignalWatcher[]  = []
  private _parsedLifecycle: { onLoad: LESNode[]; onEnter: Array<{ when: string | null; body: LESNode }>; onExit: LESNode[] } = {
    onLoad: [], onEnter: [], onExit: [],
  }

  /** Inspect parsed ASTs in DevTools: $0.parsed */
  get parsed() {
    return {
      commands:  this._parsedCommands,
      handlers:  this._parsedHandlers,
      watchers:  this._parsedWatchers,
      lifecycle: this._parsedLifecycle,
    }
  }

  // ─── Datastar bridge (populated in Phase 6) ───────────────────────────────
  private _dsEffect: ((fn: () => void) => void) | undefined = undefined
  private _dsSignal: (<T>(name: string, init?: T) => { value: T }) | undefined = undefined

  static get observedAttributes(): string[] { return [] }

  connectedCallback(): void {
    queueMicrotask(() => this._init())
  }

  disconnectedCallback(): void {
    this._teardown()
  }

  // ─── Internal lifecycle ───────────────────────────────────────────────────

  private _init(): void {
    console.log('[LES] <local-event-script> initializing', this.id || '(no id)')

    // Phase 1: DOM → config
    this._config = readConfig(this)
    logConfig(this._config)

    // Phase 2: config body strings → AST
    this._parseAll(this._config)

    // Phase 3: executor wiring  (coming next)
    // Phase 4: event listeners  (after executor)
    // Phase 5: IntersectionObserver
    // Phase 6: Datastar bridge
    // Phase 8: module loading
  }

  private _teardown(): void {
    console.log('[LES] <local-event-script> disconnected', this.id || '(no id)')
    this._config = null
    this._parsedCommands = []
    this._parsedHandlers = []
    this._parsedWatchers = []
  }

  // ─── Phase 2: parse all body strings ─────────────────────────────────────

  private _parseAll(config: LESConfig): void {
    let ok = 0
    let fail = 0

    // Commands
    this._parsedCommands = config.commands.map(decl => {
      try {
        const body = parseLES(decl.body)
        ok++
        return { name: decl.name, guard: decl.guard, argsRaw: decl.argsRaw, body }
      } catch (e) {
        fail++
        console.error(`[LES] Parse error in command "${decl.name}":`, e)
        return { name: decl.name, guard: decl.guard, argsRaw: decl.argsRaw, body: { type: 'expr' as const, raw: '' } }
      }
    })

    // Event handlers
    this._parsedHandlers = config.onEvent.map(decl => {
      try {
        const body = parseLES(decl.body)
        ok++
        return { event: decl.name, body }
      } catch (e) {
        fail++
        console.error(`[LES] Parse error in on-event "${decl.name}":`, e)
        return { event: decl.name, body: { type: 'expr' as const, raw: '' } }
      }
    })

    // Signal watchers
    this._parsedWatchers = config.onSignal.map(decl => {
      try {
        const body = parseLES(decl.body)
        ok++
        return { signal: decl.name, when: decl.when, body }
      } catch (e) {
        fail++
        console.error(`[LES] Parse error in on-signal "${decl.name}":`, e)
        return { signal: decl.name, when: decl.when, body: { type: 'expr' as const, raw: '' } }
      }
    })

    // Lifecycle hooks
    this._parsedLifecycle = {
      onLoad:  config.onLoad.map(d => { try { ok++; return parseLES(d.body) } catch { fail++; return { type: 'expr' as const, raw: '' } } }),
      onEnter: config.onEnter.map(d => { try { ok++; return { when: d.when, body: parseLES(d.body) } } catch { fail++; return { when: d.when, body: { type: 'expr' as const, raw: '' } } } }),
      onExit:  config.onExit.map(d => { try { ok++; return parseLES(d.body) } catch { fail++; return { type: 'expr' as const, raw: '' } } }),
    }

    const total = ok + fail
    console.log(`[LES] parser: ${ok}/${total} bodies parsed successfully${fail > 0 ? ` (${fail} errors)` : ''}`)

    // Log a structural preview of the most complex body
    const fetchCmd = this._parsedCommands.find(c => c.name === 'feed:fetch')
    if (fetchCmd) {
      console.log('[LES] AST preview (feed:fetch):', JSON.stringify(fetchCmd.body, null, 2).slice(0, 800) + '…')
    }
  }

  // ─── Datastar bridge (Phase 6) ────────────────────────────────────────────

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

  get dsEffect(): ((fn: () => void) => void) | undefined { return this._dsEffect }
  get dsSignal(): (<T>(name: string, init?: T) => { value: T }) | undefined { return this._dsSignal }
}

customElements.define('local-event-script', LocalEventScript)
