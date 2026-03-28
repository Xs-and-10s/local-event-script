/**
 * <local-command> — defines a named, callable command within a <local-event-script>.
 *
 * Attributes:
 *   name    Required. Command name, colon-namespaced: "feed:fetch"
 *   args    Optional. Typed argument list: "[from:str  to:str]"
 *   guard   Optional. JS expression — falsy = silent no-op, no rescue/afterwards
 *   do      Required. LES body (backtick-quoted for multi-line)
 *
 * This element is purely declarative — it holds data.
 * The host <local-event-script> reads it during Phase 1 and registers
 * the parsed CommandDef in its CommandRegistry.
 *
 * Note: <command> was a deprecated HTML5 element — we use <local-command>
 * to satisfy the custom element hyphen requirement and avoid the collision.
 */
export class LocalCommand extends HTMLElement {
  // ─── Attribute accessors (typed, trimmed) ─────────────────────────────────

  get commandName(): string {
    return this.getAttribute('name')?.trim() ?? ''
  }

  /** Raw args string e.g. "[from:str  to:str]" — parsed by Phase 2 */
  get argsRaw(): string {
    return this.getAttribute('args')?.trim() ?? ''
  }

  /** Guard expression string — evaluated by runtime before execution */
  get guardExpr(): string | null {
    return this.getAttribute('guard')?.trim() ?? null
  }

  /** Raw LES body — may be backtick-wrapped for multi-line */
  get doBody(): string {
    return this.getAttribute('do')?.trim() ?? ''
  }

  connectedCallback(): void {
    // Phase 0: verify element is recognized.
    console.log('[LES] <local-command> registered:', this.commandName || '(unnamed)')
  }
}

customElements.define('local-command', LocalCommand)
