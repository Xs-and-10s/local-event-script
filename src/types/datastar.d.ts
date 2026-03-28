/**
 * Ambient type declarations for the "datastar" module.
 *
 * The real datastar package has no package.json and cannot be installed via npm.
 * We declare only the subset of the public API that LES actually uses:
 *   - attribute()  — registers an attribute plugin
 *   - action()     — registers an action plugin (Phase 6)
 *   - effect()     — creates a reactive side effect (Phase 6)
 *   - signal()     — creates/gets a named signal (Phase 6)
 *
 * This file is compile-time only — the runtime bundle externalizes "datastar"
 * and expects it to be provided by the host page via importmap.
 */
declare module 'datastar' {
  // ─── Attribute plugin ─────────────────────────────────────────────────────

  export interface AttributeContext {
    /** The DOM element this data-* attribute is attached to */
    el: HTMLElement
    /** Colon-suffix of the attribute e.g. data-foo:KEY → key = "KEY" */
    key: string
    /** Raw attribute value string */
    value: string
    /** Evaluates the attribute expression reactively. Re-runs when signals change. */
    rx(): unknown
    /** Registers a reactive side effect (auto-cleaned on element removal) */
    effect(fn: () => void): void
    /** Creates or retrieves a named Datastar signal */
    signal<T>(name: string, initial?: T): { value: T }
    /** Creates a computed value */
    computed<T>(fn: () => T): { readonly value: T }
    /** Creates a typed runtime error */
    runtimeErr(code: string, detail: Record<string, unknown>): Error
  }

  export interface AttributePluginOptions {
    name: string
    requirement?: {
      key: 'denied' | 'must' | 'optional'
      value: 'denied' | 'must' | 'optional'
    }
    returnsValue?: boolean
    /** Called when the attribute is applied to an element. Return a cleanup fn. */
    apply(ctx: AttributeContext): (() => void) | void
  }

  export function attribute(options: AttributePluginOptions): void

  // ─── Action plugin ────────────────────────────────────────────────────────

  export interface ActionContext {
    el: HTMLElement
    [key: string]: unknown
  }

  export interface ActionPluginOptions {
    name: string
    apply(ctx: ActionContext, value: unknown): unknown
  }

  export function action(options: ActionPluginOptions): void

  // ─── Watcher plugin ───────────────────────────────────────────────────────

  export interface WatcherPluginOptions {
    name: string
    apply(event: CustomEvent): void
  }

  export function watcher(options: WatcherPluginOptions): void

  // ─── Reactive primitives (used by LES Phase 6) ───────────────────────────

  export function signal<T>(initialValue?: T): { value: T }
  export function computed<T>(getter: () => T): { readonly value: T }
  export function effect(fn: () => void): void

  /** Global reactive state tree */
  export const root: Record<string, unknown>
}
