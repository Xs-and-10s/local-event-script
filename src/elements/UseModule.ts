/**
 * <use-module> — declares a vocabulary extension available to <local-command> bodies.
 *
 * Must appear before any <local-command> in the <local-event-script>.
 * The host reads <use-module> children first (Phase 8) and registers
 * their primitives into its ModuleRegistry before parsing command bodies.
 *
 * Attributes (independent, combinable):
 *   type   Built-in module name: "animation"
 *   src    URL/path to a userland module ES module:  "./scroll-effects.js"
 *          The module must export a default conforming to LESModule:
 *          { name: string, primitives: Record<string, LESPrimitive> }
 *
 * Examples:
 *   <use-module type="animation"></use-module>
 *   <use-module src="./scroll-effects.js"></use-module>
 *   <use-module src="./spring-physics.js"></use-module>
 *
 * type= and src= may appear together on one element if the userland module
 * wants to declare its type hint for tooling (not currently required).
 */
export class UseModule extends HTMLElement {
  /** Built-in module type e.g. "animation" */
  get moduleType(): string | null {
    return this.getAttribute('type')?.trim() ?? null
  }

  /** Userland module URL e.g. "./scroll-effects.js" */
  get moduleSrc(): string | null {
    return this.getAttribute('src')?.trim() ?? null
  }

  connectedCallback(): void {
    const desc = this.moduleType
      ? `type="${this.moduleType}"`
      : this.moduleSrc
        ? `src="${this.moduleSrc}"`
        : '(no type or src)'
    console.log('[LES] <use-module> declared:', desc)
  }
}

customElements.define('use-module', UseModule)
