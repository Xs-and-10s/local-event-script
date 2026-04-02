// ─────────────────────────────────────────────────────────────────────────────
// LES Module system
//
// Modules extend the set of animation/effect primitives available in
// <local-command> bodies. Two kinds:
//
//   Built-in:  <use-module type="animation">
//   Userland:  <use-module src="./scroll-effects.js">
//
// Both resolve to a LESModule at runtime.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A primitive is an async operation the executor dispatches for AnimationNode.
 *
 * @param selector  CSS selector string (already resolved — no variable substitution needed here)
 * @param duration  milliseconds
 * @param easing    CSS easing string, e.g. 'ease-out'
 * @param options   key/value options from the trailing [...] block, already evaluated
 * @param host      the <local-event-script> element (used as querySelector root)
 */
export type LESPrimitive = (
  selector: string,
  duration: number,
  easing: string,
  options: Record<string, unknown>,
  host: Element
) => Promise<void>

/** The shape a userland module must export as its default export. */
export interface LESModule {
  /** Human-readable name for error messages */
  name: string
  primitives: Record<string, LESPrimitive>
}

// ─── Registry ────────────────────────────────────────────────────────────────

export class ModuleRegistry {
  private primitives = new Map<string, LESPrimitive>()
  private loadedModules: string[] = []

  register(module: LESModule): void {
    for (const [name, fn] of Object.entries(module.primitives)) {
      this.primitives.set(name, fn)
    }
    this.loadedModules.push(module.name)
    console.log(`[LES] module loaded: "${module.name}"`, Object.keys(module.primitives))
  }

  get(primitive: string): LESPrimitive | undefined {
    return this.primitives.get(primitive)
  }

  has(primitive: string): boolean {
    return this.primitives.has(primitive)
  }

  /** Dev-mode help: which module exports a given primitive? */
  hintFor(primitive: string): string {
    // Will be enriched in Phase 8 with per-module primitive manifests.
    return `Primitive "${primitive}" not found. Loaded modules: [${this.loadedModules.join(', ')}]. Did you forget <use-module type="animation">?`
  }
}

// ─── Loader ──────────────────────────────────────────────────────────────────

/** Built-in module registry: type name → import path */
const BUILTIN_MODULES: Record<string, () => Promise<{ default: LESModule }>> = {
  animation: () => import('./builtin/animation.js'),
  bridge:    () => import('./builtin/bridge.js'),
}

/**
 * Resolve a <use-module> element to a LESModule and register it.
 * Called during Phase 1 DOM reading (Phase 8 completes the src= path).
 */
export async function loadModule(
  registry: ModuleRegistry,
  opts: { type?: string; src?: string }
): Promise<void> {
  if (opts.type) {
    const loader = BUILTIN_MODULES[opts.type]
    if (!loader) {
      console.warn(`[LES] Unknown built-in module type: "${opts.type}". Available: ${Object.keys(BUILTIN_MODULES).join(', ')}`)
      return
    }
    const mod = await loader()
    registry.register(mod.default)
    return
  }

  if (opts.src) {
    try {
      // Resolve relative paths against the page URL, not the bundle URL.
      // Without this, './scroll-effects.js' resolves to '/dist/scroll-effects.js'
      // (relative to the bundle at /dist/local-event-script.js) instead of
      // '/scroll-effects.js' (relative to the HTML page).
      const resolvedSrc = new URL(opts.src, document.baseURI).href
      const mod = await import(/* @vite-ignore */ resolvedSrc)
      if (!mod.default || typeof mod.default.primitives !== 'object') {
        console.warn(`[LES] Module at "${opts.src}" does not export a valid LESModule. Expected: { name: string, primitives: Record<string, Function> }`)
        return
      }
      registry.register(mod.default as LESModule)
    } catch (err) {
      console.error(`[LES] Failed to load module from "${opts.src}":`, err)
    }
    return
  }

  console.warn('[LES] <use-module> requires either type= or src= attribute.')
}
