import type { LESNode, ExprNode } from '@parser/ast.js'

/** A single typed argument definition from args="[name:type  ...]" */
export interface ArgDef {
  name: string
  /** 'nil' | 'int' | 'dec' | 'str' | 'arr' | 'obj' | 'bool' | 'dyn' */
  type: string
  /** Default value expression, if provided (e.g. attempt:int=0) */
  default?: ExprNode
}

/** A fully parsed <local-command> definition. */
export interface CommandDef {
  name: string
  args: ArgDef[]
  /** Guard expression string — evaluated before execution. Falsy = silent no-op. */
  guard?: string
  /** The parsed body AST */
  body: LESNode
  /** The <local-command> DOM element, kept for error reporting */
  element: Element
}

export class CommandRegistry {
  private commands = new Map<string, CommandDef>()

  // ── Command registry inheritance ──────────────────────────────────────────
  // When a child LES element cannot find a command locally, it walks up to
  // its parent's registry. Set by LocalEventScript._init() once the tree
  // is established. Enables shared commands defined at root, callable from
  // any descendant — like class method inheritance.
  private _parent: CommandRegistry | null = null

  setParent(parent: CommandRegistry | null): void {
    this._parent = parent
  }

  register(def: CommandDef): void {
    if (this.commands.has(def.name)) {
      console.warn(
        `[LES] Duplicate command "${def.name}" — previous definition overwritten.`,
        def.element
      )
    }
    this.commands.set(def.name, def)
  }

  /** Looks up locally first, then walks up the parent chain. */
  get(name: string): CommandDef | undefined {
    return this.commands.get(name) ?? this._parent?.get(name)
  }

  /** Returns true if command exists locally (does not check parent). */
  has(name: string): boolean {
    return this.commands.has(name)
  }

  /** Returns true if command exists locally OR in any ancestor registry. */
  resolves(name: string): boolean {
    return this.commands.has(name) || (this._parent?.resolves(name) ?? false)
  }

  names(): string[] {
    return Array.from(this.commands.keys())
  }
}
