import { CommandRegistry } from '@runtime/registry.js'
import { ModuleRegistry } from '@modules/types.js'

/**
 * <local-event-script> — the host custom element.
 *
 * Responsibilities (built up across phases):
 *   Phase 0  Register as custom element, expose typed attribute API
 *   Phase 1  Walk children → build LESConfig, log structured output
 *   Phase 2  Parse all LES body strings → AST
 *   Phase 3  Run the executor
 *   Phase 4  Wire command registry + event listeners
 *   Phase 5  Attach IntersectionObserver for on-enter / on-exit
 *   Phase 6  Connect Datastar plugin (effect, signal)
 *   Phase 7  Activate animation module
 *   Phase 8  Load <use-module> entries
 */
export class LocalEventScript extends HTMLElement {
  // ─── Public registries (other elements attach to these) ───────────────────
  readonly commands = new CommandRegistry()
  readonly modules  = new ModuleRegistry()

  // ─── Datastar bridge (populated in Phase 6) ───────────────────────────────
  private _dsEffect: ((fn: () => void) => void) | undefined = undefined
  private _dsSignal: (<T>(name: string, init?: T) => { value: T }) | undefined = undefined

  // ─── Phase 0: observed attributes ────────────────────────────────────────
  static get observedAttributes(): string[] {
    // data-signals:* are handled by Datastar, not us.
    // We only observe our own structural attributes here.
    return []
  }

  connectedCallback(): void {
    // Defer until children have been parsed by the browser.
    // queueMicrotask is enough for same-tick children; for SSR-injected
    // content a rAF or MutationObserver may be needed (Phase 1 revisit).
    queueMicrotask(() => this._init())
  }

  disconnectedCallback(): void {
    this._teardown()
  }

  // ─── Internal lifecycle ───────────────────────────────────────────────────

  private _init(): void {
    // Phase 0: just confirm the element is alive.
    console.log('[LES] <local-event-script> initializing', this.id || '(no id)')

    // Phase 1 will call this._readConfig() here.
    // Phase 6 will call this._connectDatastar() here.
  }

  private _teardown(): void {
    console.log('[LES] <local-event-script> disconnected', this.id || '(no id)')
    // Phase 5 will disconnect IntersectionObserver here.
    // Phase 6 will unsubscribe Datastar effects here.
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

  get dsEffect(): ((fn: () => void) => void) | undefined {
    return this._dsEffect
  }

  get dsSignal(): (<T>(name: string, init?: T) => { value: T }) | undefined {
    return this._dsSignal
  }
}

customElements.define('local-event-script', LocalEventScript)
