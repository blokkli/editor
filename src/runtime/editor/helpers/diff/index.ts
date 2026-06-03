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

/**
 * Render the new value entirely as an insertion, with no deletions.
 *
 * Used when diffing against the original is pointless — e.g. translations,
 * where virtually the whole text changes and an interleaved del/ins diff is
 * just noise. The result reuses the same <ins> markup as computeDiff, so the
 * approval preview styling is identical.
 *
 * Block-level HTML is preserved by wrapping each block's inner content in
 * <ins> rather than wrapping the block tags themselves.
 */
export function computeInsertion(after: string): string {
  const blocks = parseBlocks(after)

  if (blocks && blocks.length > 0) {
    return blocks
      .map(
        (block) =>
          `${block.openTag}<ins>${block.innerHTML}</ins></${block.tag}>`,
      )
      .join('')
  }

  return `<ins>${after}</ins>`
}

// ============================================================================
// Segments — per-chunk approval support
// ============================================================================

/**
 * One chunk of a field's diff that can be individually accepted or rejected
 * by the user. A markup field becomes an ordered list of segments; lists
 * (<ul>/<ol>) become a `list` segment whose children are the individual
 * <li> atoms.
 *
 * Acceptance semantics (see `reassembleValue`):
 * - matched: accepted → afterHtml, rejected → beforeHtml
 * - inserted: accepted → keep, rejected → drop
 * - deleted: accepted → drop (matches after), rejected → restore (matches before)
 */
export type AtomicSegment = {
  kind: 'atomic'
  id: string
  tag: string
  openTag: string
  closeTag: string
  beforeHtml: string
  afterHtml: string
  changed: boolean
  status: 'matched' | 'inserted' | 'deleted'
}

export type ListSegment = {
  kind: 'list'
  id: string
  tag: 'ul' | 'ol'
  openTag: string
  closeTag: string
  children: AtomicSegment[]
}

export type Segment = AtomicSegment | ListSegment

/** Parse <ul>/<ol> innerHTML into <li> blocks. Returns null on anything else. */
function parseListItems(html: string): Block[] | null {
  const container = document.createElement('div')
  container.innerHTML = html
  const items: Block[] = []

  for (const child of container.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (tag !== 'li') return null
      let openTag = `<${tag}`
      for (const attr of el.attributes) {
        openTag += ` ${attr.name}="${attr.value}"`
      }
      openTag += '>'
      items.push({ tag, innerHTML: el.innerHTML, openTag })
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      return null
    }
  }

  return items
}

/**
 * Align two arrays of <li> blocks. Unlike `alignBlocks` (which keys on tag —
 * useless for lists where every item is <li>), this aligns by innerHTML
 * equality to identify unchanged anchors, then pairs the runs between anchors
 * positionally as matched-changed entries. Leftover befores become deletes,
 * leftover afters become inserts, at their natural reading position.
 *
 * Handles the common rewrite shape (most items rewritten, none unchanged) by
 * pairing positionally, and the common edit shape (one item added or removed)
 * by anchoring on the unchanged items around it.
 */
function alignListItems(before: Block[], after: Block[]): AlignmentEntry[] {
  const m = before.length
  const n = after.length

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (before[i - 1]!.innerHTML === after[j - 1]!.innerHTML) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!)
      }
    }
  }

  type Op =
    | { type: 'unchanged'; before: Block; after: Block }
    | { type: 'before'; block: Block }
    | { type: 'after'; block: Block }
  const ops: Op[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (before[i - 1]!.innerHTML === after[j - 1]!.innerHTML) {
      ops.push({
        type: 'unchanged',
        before: before[i - 1]!,
        after: after[j - 1]!,
      })
      i--
      j--
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      ops.push({ type: 'before', block: before[i - 1]! })
      i--
    } else {
      ops.push({ type: 'after', block: after[j - 1]! })
      j--
    }
  }
  while (i > 0) {
    ops.push({ type: 'before', block: before[i - 1]! })
    i--
  }
  while (j > 0) {
    ops.push({ type: 'after', block: after[j - 1]! })
    j--
  }
  ops.reverse()

  const entries: AlignmentEntry[] = []
  let k = 0
  while (k < ops.length) {
    const op = ops[k]!
    if (op.type === 'unchanged') {
      entries.push({ type: 'match', before: op.before, after: op.after })
      k++
      continue
    }
    const befores: Block[] = []
    const afters: Block[] = []
    while (k < ops.length && ops[k]!.type !== 'unchanged') {
      const r = ops[k]!
      if (r.type === 'before') befores.push(r.block)
      else if (r.type === 'after') afters.push(r.block)
      k++
    }
    const pairCount = Math.min(befores.length, afters.length)
    for (let p = 0; p < pairCount; p++) {
      entries.push({ type: 'match', before: befores[p]!, after: afters[p]! })
    }
    for (let p = pairCount; p < befores.length; p++) {
      entries.push({ type: 'delete', before: befores[p]! })
    }
    for (let p = pairCount; p < afters.length; p++) {
      entries.push({ type: 'insert', after: afters[p]! })
    }
  }
  return entries
}

function atomicFromAlignment(entry: AlignmentEntry, id: string): AtomicSegment {
  if (entry.type === 'match') {
    return {
      kind: 'atomic',
      id,
      tag: entry.after.tag,
      openTag: entry.after.openTag,
      closeTag: `</${entry.after.tag}>`,
      beforeHtml: entry.before.innerHTML,
      afterHtml: entry.after.innerHTML,
      changed: entry.before.innerHTML !== entry.after.innerHTML,
      status: 'matched',
    }
  }
  if (entry.type === 'delete') {
    return {
      kind: 'atomic',
      id,
      tag: entry.before.tag,
      openTag: entry.before.openTag,
      closeTag: `</${entry.before.tag}>`,
      beforeHtml: entry.before.innerHTML,
      afterHtml: '',
      changed: true,
      status: 'deleted',
    }
  }
  return {
    kind: 'atomic',
    id,
    tag: entry.after.tag,
    openTag: entry.after.openTag,
    closeTag: `</${entry.after.tag}>`,
    beforeHtml: '',
    afterHtml: entry.after.innerHTML,
    changed: true,
    status: 'inserted',
  }
}

/**
 * Split a before/after value pair into chunks the user can individually
 * accept or reject. Returns null when chunk-level approval can't apply:
 *
 * - non-markup fields
 * - either side contains inline-only HTML or stray top-level text
 *   (`parseBlocks` returns null)
 * - both sides empty
 *
 * Two-level structure: top-level block alignment, then a one-level recurse
 * into matched <ul>/<ol> blocks whose innerHTML differs. <li> is the leaf.
 *
 * Used for both rewrites (word-diff preview) and translations
 * (insertion-only preview). The difference is at the renderer.
 */
export function splitIntoSegments(
  before: string,
  after: string,
  fieldType: 'plain' | 'markup',
): Segment[] | null {
  if (fieldType !== 'markup') return null
  const beforeBlocks = parseBlocks(before)
  const afterBlocks = parseBlocks(after)
  if (!beforeBlocks || !afterBlocks) return null
  if (beforeBlocks.length === 0 && afterBlocks.length === 0) return null

  const alignment = alignBlocks(beforeBlocks, afterBlocks)
  const segments: Segment[] = []

  alignment.forEach((entry, index) => {
    const id = String(index)

    if (
      entry.type === 'match' &&
      (entry.after.tag === 'ul' || entry.after.tag === 'ol') &&
      entry.before.innerHTML !== entry.after.innerHTML
    ) {
      const beforeItems = parseListItems(entry.before.innerHTML)
      const afterItems = parseListItems(entry.after.innerHTML)
      if (beforeItems && afterItems) {
        const childAlignment = alignListItems(beforeItems, afterItems)
        const children = childAlignment.map((childEntry, childIndex) =>
          atomicFromAlignment(childEntry, `${id}/${childIndex}`),
        )
        segments.push({
          kind: 'list',
          id,
          tag: entry.after.tag as 'ul' | 'ol',
          openTag: entry.after.openTag,
          closeTag: `</${entry.after.tag}>`,
          children,
        })
        return
      }
      // Fallthrough: treat the list as an atomic block.
    }

    segments.push(atomicFromAlignment(entry, id))
  })

  return segments
}

/**
 * True when at least one segment (or list child) actually changes. Use to
 * skip the approval row for fields where the proposed value already matches
 * the current value chunk-for-chunk.
 */
export function segmentsHaveChanges(segments: Segment[]): boolean {
  return segments.some((seg) =>
    seg.kind === 'list'
      ? seg.children.some(
          (c) => c.status !== 'matched' || c.beforeHtml !== c.afterHtml,
        )
      : seg.status !== 'matched' || seg.beforeHtml !== seg.afterHtml,
  )
}

/** Inject an attribute into a normal '>'-terminated opening tag. */
function injectAttribute(openTag: string, name: string, value: string): string {
  return openTag.slice(0, -1) + ` ${name}="${value}">`
}

function renderAtomicDiffMarkup(
  seg: AtomicSegment,
  opts: {
    insertionsOnly?: boolean
    acceptedById?: Record<string, boolean>
  },
): string {
  const open = injectAttribute(seg.openTag, 'data-chunk-index', seg.id)
  const accepted = opts.acceptedById?.[seg.id] !== false

  if (seg.status === 'inserted') {
    // Rejecting an insertion drops the block from the final value — but the
    // DOM node has to stay so the rectangle still outlines something and the
    // user can re-toggle it. Render it as a deletion to signal "won't land".
    if (!accepted) {
      return `${open}<del>${seg.afterHtml}</del>${seg.closeTag}`
    }
    return `${open}<ins>${seg.afterHtml}</ins>${seg.closeTag}`
  }
  if (seg.status === 'deleted') {
    // Rejecting a deletion = the block stays. Show it plain, no del markers.
    if (!accepted) {
      return `${open}${seg.beforeHtml}${seg.closeTag}`
    }
    return `${open}<del>${seg.beforeHtml}</del>${seg.closeTag}`
  }
  // matched
  if (!accepted) {
    // Rejecting a modification reverts the chunk to its original content.
    // No diff markers — the user sees what would actually land on apply.
    return `${open}${seg.beforeHtml}${seg.closeTag}`
  }
  if (opts.insertionsOnly) {
    return `${open}<ins>${seg.afterHtml}</ins>${seg.closeTag}`
  }
  if (seg.beforeHtml === seg.afterHtml) {
    return `${open}${seg.afterHtml}${seg.closeTag}`
  }
  const innerDiff = diff(seg.beforeHtml, seg.afterHtml)
  return `${open}${cleanupDiffMods(innerDiff)}${seg.closeTag}`
}

/**
 * Render segments as preview HTML with `data-chunk-index` attributes on each
 * atomic block, so the approval UI can locate each chunk's DOM bounds. The
 * resulting markup replaces the editable's innerHTML during preview, just
 * like `computeDiff` / `computeInsertion`.
 *
 * `insertionsOnly` matches the existing prop on DiffApproval — translations
 * render new content as a single <ins> per leaf, rewrites render word-diffs.
 *
 * `acceptedById` (optional) makes the preview track per-segment acceptance:
 * rejected matched segments render their original content with no markers,
 * rejected insertions render as deletions, rejected deletions render plain.
 * Defaults to "all accepted" when omitted (initial render).
 */
export function renderSegmentDiff(
  segments: Segment[],
  opts: {
    insertionsOnly?: boolean
    acceptedById?: Record<string, boolean>
  } = {},
): string {
  const parts: string[] = []
  for (const seg of segments) {
    if (seg.kind === 'list') {
      const childParts = seg.children.map((c) =>
        renderAtomicDiffMarkup(c, opts),
      )
      parts.push(`${seg.openTag}${childParts.join('')}${seg.closeTag}`)
    } else {
      parts.push(renderAtomicDiffMarkup(seg, opts))
    }
  }
  return parts.join('')
}

/**
 * Reassemble a field value from segments using per-segment acceptance.
 * Acceptance defaults to `true` for any unmapped segment id, mirroring the
 * DiffApproval initial state.
 *
 * For `list` segments the wrapper is emitted only when at least one child
 * survives — accepting a full deletion of every item drops the list itself.
 */
export function reassembleValue(
  segments: Segment[],
  acceptedById: Record<string, boolean>,
): string {
  const isAccepted = (id: string): boolean => acceptedById[id] !== false

  const renderAtomic = (seg: AtomicSegment): string => {
    const accepted = isAccepted(seg.id)
    if (seg.status === 'matched') {
      return (
        seg.openTag + (accepted ? seg.afterHtml : seg.beforeHtml) + seg.closeTag
      )
    }
    if (seg.status === 'inserted') {
      return accepted ? seg.openTag + seg.afterHtml + seg.closeTag : ''
    }
    return accepted ? '' : seg.openTag + seg.beforeHtml + seg.closeTag
  }

  const parts: string[] = []
  for (const seg of segments) {
    if (seg.kind === 'list') {
      const childParts = seg.children.map(renderAtomic).filter((p) => p)
      if (childParts.length > 0) {
        parts.push(`${seg.openTag}${childParts.join('')}${seg.closeTag}`)
      }
    } else {
      const out = renderAtomic(seg)
      if (out) parts.push(out)
    }
  }
  return parts.join('')
}

/**
 * Walk a segment list and return every atomic segment in reading order,
 * including those inside list wrappers. Used by the approval UI for
 * keyboard nav, selection initialisation, and the rejected-segments
 * feedback to the agent.
 */
export function flattenSegments(segments: Segment[]): AtomicSegment[] {
  const out: AtomicSegment[] = []
  for (const seg of segments) {
    if (seg.kind === 'list') {
      out.push(...seg.children)
    } else {
      out.push(seg)
    }
  }
  return out
}
