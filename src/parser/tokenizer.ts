// ─────────────────────────────────────────────────────────────────────────────
// LES Tokenizer
//
// Converts a stripBody'd source string into a flat array of Token objects.
// Tokens are simply non-blank lines with their indent level recorded.
// No semantic analysis happens here — that's the parser's job.
//
// The tokenizer is deliberately minimal: it preserves the raw indentation
// information the parser needs to understand block structure.
// ─────────────────────────────────────────────────────────────────────────────

export interface Token {
  /** Column offset of the first non-whitespace character (number of spaces) */
  indent: number
  /** Trimmed line content — no leading/trailing whitespace */
  text: string
  /** 1-based line number in the stripped source (for error messages) */
  lineNum: number
}

/**
 * Converts a stripped LES body string into a Token array.
 * Blank lines are dropped. Tabs are expanded to 2 spaces each.
 *
 * @param source  A string already processed by stripBody() — no backtick wrappers.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  const lines = source.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const raw = (lines[i] ?? '').replace(/\t/g, '  ')
    const text = raw.trim()

    // Skip blank lines
    if (text.length === 0) continue

    const indent = raw.length - raw.trimStart().length

    tokens.push({
      indent,
      text,
      lineNum: i + 1,
    })
  }

  return tokens
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers used by both the tokenizer tests and the parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if `text` ends with a standalone `and` word.
 * Used by the parser to detect parallel branches.
 *
 * Careful: "england", "band", "command" must NOT match.
 * We require a word boundary before `and` and end-of-string after.
 */
export function endsWithAnd(text: string): boolean {
  return /\band$/.test(text)
}

/**
 * Strips the trailing ` and` from a line that endsWithAnd.
 * Returns the trimmed line content without it.
 */
export function stripTrailingAnd(text: string): string {
  return text.replace(/\s+and$/, '').trimEnd()
}

/**
 * Block terminator tokens — signal the end of a match or try block.
 * These are consumed by the block-owning parser (parseMatch / parseTry),
 * not by parseBlock itself.
 */
export const BLOCK_TERMINATORS = new Set(['/match', '/try'])

/**
 * Keywords that end a try body and start a rescue/afterwards clause.
 * Recognized only when they appear at the same indent level as the `try`.
 */
export const TRY_CLAUSE_KEYWORDS = new Set(['rescue', 'afterwards'])
