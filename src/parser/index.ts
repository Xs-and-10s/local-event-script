import { stripBody } from './stripBody.js'
import { tokenize } from './tokenizer.js'
import { LESParser } from './parser.js'
import type { LESNode } from './ast.js'

export { LESParser, LESParseError } from './parser.js'
export { tokenize, endsWithAnd, stripTrailingAnd } from './tokenizer.js'
export { stripBody } from './stripBody.js'
export type { Token } from './tokenizer.js'
export * from './ast.js'
export * from './config.js'

/**
 * Parse a raw LES body string (from a do=, handle=, or run= attribute)
 * into a typed AST node.
 *
 * This is the public entry point for Phase 2:
 *   - Strips backtick wrapper and normalizes indentation (stripBody)
 *   - Tokenizes into lines with indent levels (tokenize)
 *   - Parses into a typed LESNode AST (LESParser)
 *
 * @throws LESParseError on unrecoverable syntax errors (currently soft-warns instead)
 */
export function parseLES(raw: string): LESNode {
  const stripped = stripBody(raw)
  const tokens   = tokenize(stripped)
  const parser   = new LESParser(tokens)
  return parser.parse()
}
