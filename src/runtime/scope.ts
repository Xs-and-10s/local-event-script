/**
 * LESScope — a simple lexically-scoped variable store.
 *
 * Each command invocation gets a fresh child scope.
 * Match arm bindings also create a child scope limited to that arm's body.
 * Signal reads/writes go through the Datastar bridge, not this scope.
 */
export class LESScope {
  private locals = new Map<string, unknown>()

  constructor(private readonly parent?: LESScope) {}

  get(name: string): unknown {
    if (this.locals.has(name)) return this.locals.get(name)
    return this.parent?.get(name)
  }

  set(name: string, value: unknown): void {
    this.locals.set(name, value)
  }

  has(name: string): boolean {
    return this.locals.has(name) || (this.parent?.has(name) ?? false)
  }

  /** Create a child scope inheriting all locals from this one. */
  child(): LESScope {
    return new LESScope(this)
  }

  /** Snapshot all locals (for debugging / error messages). */
  snapshot(): Record<string, unknown> {
    const base = this.parent?.snapshot() ?? {}
    for (const [k, v] of this.locals) base[k] = v
    return base
  }
}
