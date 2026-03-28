/**
 * Strips the backtick wrapper from a multi-line LES body string and
 * normalizes indentation, producing a clean string the parser can work with.
 *
 * Convention:
 *   Single-line:  handle="emit feed:init"           → "emit feed:init"
 *   Multi-line:   do="`\n      set...\n    `"        → "set...\n..."
 *
 * Algorithm:
 *   1. Trim outer whitespace from the raw attribute value.
 *   2. If wrapped in backticks, strip them — do NOT inner-trim yet.
 *   3. Split into lines and compute minimum non-zero indentation
 *      across all non-empty lines. This is the HTML attribute indentation
 *      level to remove.
 *   4. Strip that many leading characters from every line.
 *   5. Drop leading/trailing blank lines, return joined result.
 *
 * Crucially, step 2 does NOT call .trim() on the inner content before
 * computing indentation. An inner .trim() would destroy the leading
 * whitespace on line 1, making minIndent = 0 and leaving all other
 * lines un-de-indented.
 */
export function stripBody(raw: string): string {
  let s = raw.trim()

  // Strip backtick wrapper — but preserve internal whitespace for de-indent
  if (s.startsWith('`') && s.endsWith('`')) {
    s = s.slice(1, -1)
    // Do NOT .trim() here — that kills the leading indent on line 1
  }

  const lines = s.split('\n')
  const nonEmpty = lines.filter(l => l.trim().length > 0)
  if (nonEmpty.length === 0) return ''

  // For single-line values (no newlines after backtick strip), just trim
  if (lines.length === 1) return s.trim()

  // Minimum leading whitespace across non-empty lines
  const minIndent = nonEmpty.reduce((min, line) => {
    const leading = line.match(/^(\s*)/)?.[1]?.length ?? 0
    return Math.min(min, leading)
  }, Infinity)

  const stripped = minIndent === 0 || minIndent === Infinity
    ? lines
    : lines.map(line => line.length >= minIndent ? line.slice(minIndent) : line.trimStart())

  // Drop leading and trailing blank lines (the newlines around backtick content)
  let start = 0
  let end = stripped.length - 1
  while (start <= end && stripped[start]?.trim() === '') start++
  while (end >= start && stripped[end]?.trim() === '') end--

  return stripped.slice(start, end + 1).join('\n')
}
