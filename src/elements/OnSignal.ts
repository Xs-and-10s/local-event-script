/**
 * <on-signal> — reacts whenever a named Datastar signal changes value.
 *
 * Attributes:
 *   name    Required. Signal reference: "$feedState", "$feedItems"
 *   when    Optional. Guard expression — only fires handle when truthy
 *   handle  Required. LES body
 *
 * Phase 6 wires this to Datastar's effect() system.
 * Until Datastar is connected, falls back to polling (Phase 6 decides).
 *
 * The `when` guard is re-evaluated on every signal change.
 * Guard failure is not an error — the handle simply does not run.
 */
export class OnSignal extends HTMLElement {
  /** Signal name including $ prefix: "$feedState" */
  get signalName(): string {
    return this.getAttribute('name')?.trim() ?? ''
  }

  /** Signal name without $ prefix, for Datastar API calls */
  get signalKey(): string {
    return this.signalName.replace(/^\$/, '')
  }

  get whenExpr(): string | null {
    return this.getAttribute('when')?.trim() ?? null
  }

  get handleBody(): string {
    return this.getAttribute('handle')?.trim() ?? ''
  }

  connectedCallback(): void {
    console.log('[LES] <on-signal> registered:', this.signalName || '(unnamed)')
  }
}

customElements.define('on-signal', OnSignal)
