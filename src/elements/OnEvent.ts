/**
 * <on-event> — subscribes to a named CustomEvent dispatched within the LES host.
 *
 * Attributes:
 *   name    Required. Event name: "feed:init", "item:dismissed"
 *   handle  Required. LES body — single-line (no backticks) or multi-line (backticks)
 *
 * Phase 4 wires a CustomEvent listener on the host element.
 * Events fired by `emit` never bubble; only handlers within the same
 * <local-event-script> see them. Use `broadcast` to cross the boundary.
 */
export class OnEvent extends HTMLElement {
  get eventName(): string {
    return this.getAttribute('name')?.trim() ?? ''
  }

  /** Raw LES handle body */
  get handleBody(): string {
    return this.getAttribute('handle')?.trim() ?? ''
  }

  connectedCallback(): void {
    console.log('[LES] <on-event> registered:', this.eventName || '(unnamed)')
  }
}

customElements.define('on-event', OnEvent)
