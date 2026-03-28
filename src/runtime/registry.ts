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

  register(def: CommandDef): void {
    if (this.commands.has(def.name)) {
      console.warn(
        `[LES] Duplicate command "${def.name}" — previous definition overwritten.`,
        def.element
      )
    }
    this.commands.set(def.name, def)
  }

  get(name: string): CommandDef | undefined {
    return this.commands.get(name)
  }

  has(name: string): boolean {
    return this.commands.has(name)
  }

  names(): string[] {
    return Array.from(this.commands.keys())
  }
}
