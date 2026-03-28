/**
 * <on-load> — fires its `run` body once when the host connects to the DOM.
 *
 * Timing: if document.readyState === 'complete', fires immediately in
 * connectedCallback (via queueMicrotask). Otherwise waits for DOMContentLoaded.
 *
 * Rule: lifecycle hooks always fire events (`emit`), never call commands directly.
 * This keeps the system traceable — every command invocation has an event in its history.
 *
 * Attributes:
 *   run   Required. Single-line LES body (usually just `emit event:name`)
 */
export class OnLoad extends HTMLElement {
  get runBody(): string {
    return this.getAttribute('run')?.trim() ?? ''
  }

  connectedCallback(): void {
    console.log('[LES] <on-load> registered, run:', this.runBody)
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * <on-enter> — fires when the host <local-event-script> enters the viewport.
 *
 * Uses a single IntersectionObserver shared across all <on-enter>/<on-exit>
 * children of the same host (Phase 5 creates it on the host element).
 *
 * Attributes:
 *   when  Optional. Guard expression — only fires run when truthy.
 *          Pattern: `when="$feedState == 'paused'"`
 *   run   Required. Single-line LES body.
 */
export class OnEnter extends HTMLElement {
  get whenExpr(): string | null {
    return this.getAttribute('when')?.trim() ?? null
  }

  get runBody(): string {
    return this.getAttribute('run')?.trim() ?? ''
  }

  connectedCallback(): void {
    console.log('[LES] <on-enter> registered, when:', this.whenExpr ?? 'always')
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * <on-exit> — fires when the host <local-event-script> exits the viewport.
 *
 * No `when` guard — exit always fires unconditionally.
 * (If you need conditional exit behavior, put the condition in the handler.)
 *
 * Attributes:
 *   run   Required. Single-line LES body.
 */
export class OnExit extends HTMLElement {
  get runBody(): string {
    return this.getAttribute('run')?.trim() ?? ''
  }

  connectedCallback(): void {
    console.log('[LES] <on-exit> registered, run:', this.runBody)
  }
}

// ─── Registration ─────────────────────────────────────────────────────────────

customElements.define('on-load',  OnLoad)
customElements.define('on-enter', OnEnter)
customElements.define('on-exit',  OnExit)
