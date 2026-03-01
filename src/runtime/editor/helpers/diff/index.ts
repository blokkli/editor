import diff from 'html-diff-ts'

/**
 * Matches a single diffmod del/ins pair.
 */
const PAIR_RE =
  /<del class="diffmod">((?:[^<]|<(?!\/del>))*?)<\/del><ins class="diffmod">((?:[^<]|<(?!\/ins>))*?)<\/ins>/g

type Token =
  | { type: 'pair'; del: string; ins: string; raw: string }
  | { type: 'other'; text: string }

/**
 * Tokenize diff HTML into diffmod pairs and everything else.
 */
function tokenize(html: string): Token[] {
  const tokens: Token[] = []
  let lastIndex = 0

  PAIR_RE.lastIndex = 0
  let match = PAIR_RE.exec(html)
  while (match) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'other', text: html.slice(lastIndex, match.index) })
    }
    tokens.push({
      type: 'pair',
      del: match[1] || '',
      ins: match[2] || '',
      raw: match[0],
    })
    lastIndex = match.index + match[0].length
    match = PAIR_RE.exec(html)
  }

  if (lastIndex < html.length) {
    tokens.push({ type: 'other', text: html.slice(lastIndex) })
  }

  return tokens
}

/**
 * Check if a text node between diffmod pairs is a short separator that should
 * be absorbed into a merged run. This includes plain whitespace, &nbsp;, and
 * short unchanged words (e.g. "and", "or", prepositions) that sit between
 * modified words.
 *
 * We consider any text that contains no HTML tags and is short enough to be
 * a connective word or punctuation.
 */
function isMergeableSeparator(text: string): boolean {
  // Must not contain HTML tags.
  if (/<[^>]+>/.test(text)) {
    return false
  }

  // Pure whitespace / &nbsp; is always mergeable.
  if (/^(?:\s|&nbsp;)*$/.test(text)) {
    return true
  }

  // Short plain text (a word or two, with surrounding whitespace) — allow up
  // to ~20 chars which covers connective words like " and ", " or ", " the ".
  return text.length <= 20
}

/**
 * Merge consecutive diffmod del/ins pairs when there are 3+ in a run.
 *
 * Word-level diffs are great for small edits, but when most words changed the
 * interleaved <del>/<ins> output becomes unreadable. This collapses long runs
 * into a single <del>old text</del><ins>new text</ins>.
 */
function cleanupDiffMods(html: string): string {
  const tokens = tokenize(html)

  // Collect runs: sequences of pairs optionally separated by mergeable text.
  type Run = {
    startIndex: number
    endIndex: number // exclusive
    pairCount: number
  }

  const runs: Run[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]
    if (token?.type !== 'pair') {
      i++
      continue
    }

    // Start a new run.
    const run: Run = { startIndex: i, endIndex: i + 1, pairCount: 1 }

    let j = i + 1
    while (j < tokens.length) {
      const next = tokens[j]
      if (!next) break

      if (next.type === 'pair') {
        run.endIndex = j + 1
        run.pairCount++
        j++
        continue
      }

      // "other" token — check if it's a mergeable separator followed by
      // another pair.
      const afterNext = tokens[j + 1]
      if (
        next.type === 'other' &&
        isMergeableSeparator(next.text) &&
        afterNext?.type === 'pair'
      ) {
        // Include both the separator and the next pair.
        run.endIndex = j + 2
        run.pairCount++
        j += 2
        continue
      }

      // Not mergeable — end the run.
      break
    }

    runs.push(run)
    i = run.endIndex
  }

  // Filter to runs with 3+ pairs, then rebuild the HTML.
  const mergeSet = new Set<number>()
  const mergeRuns = runs.filter((r) => r.pairCount >= 3)
  for (const run of mergeRuns) {
    for (let k = run.startIndex; k < run.endIndex; k++) {
      mergeSet.add(k)
    }
  }

  if (mergeRuns.length === 0) {
    return html
  }

  let result = ''
  let ri = 0 // index into mergeRuns

  for (let k = 0; k < tokens.length; k++) {
    // Check if this token is the start of a merge run.
    if (ri < mergeRuns.length && k === mergeRuns[ri]?.startIndex) {
      const run = mergeRuns[ri]!
      const dels: string[] = []
      const inss: string[] = []

      for (let m = run.startIndex; m < run.endIndex; m++) {
        const t = tokens[m]!
        if (t.type === 'pair') {
          dels.push(t.del)
          inss.push(t.ins)
        } else {
          // Separator text — include in both sides.
          dels.push(t.text)
          inss.push(t.text)
        }
      }

      result += `<del>${dels.join('')}</del><ins>${inss.join('')}</ins>`
      k = run.endIndex - 1 // will be incremented by the for loop
      ri++
      continue
    }

    // Not part of a merge — emit as-is.
    const t = tokens[k]!
    result += t.type === 'pair' ? t.raw : t.text
  }

  return result
}

const BLOCK_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'blockquote',
  'pre',
  'div',
  'table',
  'figure',
  'section',
  'article',
])

type Block = {
  tag: string
  innerHTML: string
  openTag: string
}

/**
 * Parse HTML into top-level block elements.
 *
 * Returns null if the content contains non-block children (text nodes or
 * inline elements at the top level), signaling that a flat diff should be
 * used instead.
 */
function parseBlocks(html: string): Block[] | null {
  const container = document.createElement('div')
  container.innerHTML = html
  const blocks: Block[] = []

  for (const child of container.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (!BLOCK_TAGS.has(tag)) {
        return null
      }
      let openTag = `<${tag}`
      for (const attr of el.attributes) {
        openTag += ` ${attr.name}="${attr.value}"`
      }
      openTag += '>'
      blocks.push({ tag, innerHTML: el.innerHTML, openTag })
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      return null
    }
  }

  return blocks
}

type AlignmentEntry =
  | { type: 'match'; before: Block; after: Block }
  | { type: 'delete'; before: Block }
  | { type: 'insert'; after: Block }

/**
 * Align two arrays of blocks using LCS on tag names.
 */
function alignBlocks(before: Block[], after: Block[]): AlignmentEntry[] {
  const m = before.length
  const n = after.length

  // Build LCS table.
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (before[i - 1]!.tag === after[j - 1]!.tag) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
      }
    }
  }

  // Backtrack to produce alignment.
  const entries: AlignmentEntry[] = []
  let i = m
  let j = n

  while (i > 0 && j > 0) {
    if (before[i - 1]!.tag === after[j - 1]!.tag) {
      entries.push({
        type: 'match',
        before: before[i - 1]!,
        after: after[j - 1]!,
      })
      i--
      j--
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      entries.push({ type: 'delete', before: before[i - 1]! })
      i--
    } else {
      entries.push({ type: 'insert', after: after[j - 1]! })
      j--
    }
  }

  while (i > 0) {
    entries.push({ type: 'delete', before: before[i - 1]! })
    i--
  }
  while (j > 0) {
    entries.push({ type: 'insert', after: after[j - 1]! })
    j--
  }

  return entries.reverse()
}

/**
 * Compute a block-aware diff by aligning block elements and diffing
 * their innerHTML individually. This prevents diff markers from crossing
 * block element boundaries.
 */
function computeBlockDiff(before: Block[], after: Block[]): string {
  const alignment = alignBlocks(before, after)
  const parts: string[] = []

  for (const entry of alignment) {
    if (entry.type === 'match') {
      if (entry.before.innerHTML === entry.after.innerHTML) {
        // Unchanged block.
        parts.push(
          `${entry.after.openTag}${entry.after.innerHTML}</${entry.after.tag}>`,
        )
      } else {
        const innerDiff = diff(entry.before.innerHTML, entry.after.innerHTML)
        parts.push(
          `${entry.after.openTag}${cleanupDiffMods(innerDiff)}</${entry.after.tag}>`,
        )
      }
    } else if (entry.type === 'delete') {
      parts.push(
        `${entry.before.openTag}<del>${entry.before.innerHTML}</del></${entry.before.tag}>`,
      )
    } else {
      parts.push(
        `${entry.after.openTag}<ins>${entry.after.innerHTML}</ins></${entry.after.tag}>`,
      )
    }
  }

  return parts.join('')
}

/**
 * Compute an inline HTML diff between two strings.
 *
 * For content with block-level HTML elements (p, h1-h6, etc.), aligns blocks
 * by tag name and diffs within each block individually, preventing diff markers
 * from crossing element boundaries.
 *
 * For plain text or inline-only HTML, uses flat word-level diffing with
 * post-processing to merge long runs of consecutive modifications.
 */
export function computeDiff(before: string, after: string): string {
  const beforeBlocks = parseBlocks(before)
  const afterBlocks = parseBlocks(after)

  if (
    beforeBlocks &&
    afterBlocks &&
    (beforeBlocks.length > 0 || afterBlocks.length > 0)
  ) {
    return computeBlockDiff(beforeBlocks, afterBlocks)
  }

  const raw = diff(before, after)
  return cleanupDiffMods(raw)
}
