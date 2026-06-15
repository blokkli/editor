/**
 * Parser for the sub-agent streaming format with search/replace support.
 *
 * The LLM outputs edits using markers with square-bracket delimiters
 * (to avoid confusion with HTML angle brackets in the content):
 *
 * ```
 * [[[FIELD:0]]]
 * [[[SEARCH]]]
 * misspelled word
 * [[[REPLACE]]]
 * correctly spelled word
 * [[[FIELD:2]]]
 * [[[FULL]]]
 * complete new value for field 2
 * ```
 *
 * - `[[[FIELD:N]]]` starts edits for field at 0-based index N.
 * - `[[[SEARCH]]]...[[[REPLACE]]]...` is a find-and-replace pair.
 * - `[[[FULL]]]` replaces the entire field value.
 * - Multiple SEARCH/REPLACE pairs per field are allowed.
 * - Only fields that need changes are included.
 */

export type ParserEvent =
  | { type: 'field_start'; index: number; mode: 'full' | 'patch' }
  | { type: 'full_delta'; index: number; value: string }
  | { type: 'replace_delta'; index: number; search: string; value: string }
  | { type: 'operation_end'; index: number; search: string; replace: string }
  | { type: 'field_end'; index: number }

type State = 'IDLE' | 'FIELD_START' | 'IN_FULL' | 'IN_SEARCH' | 'IN_REPLACE'

// All markers start with '[[['. The longest is '[[[FIELD:NNN]]]' which
// can vary, but we need a safe tail buffer size. '[[[REPLACE]]]' is 14 chars.
// Use 16 to be safe for multi-digit field indices.
const MAX_MARKER_LENGTH = 16

const FIELD_RE = /^\[\[\[FIELD:(\d+)\]\]\]/
const SEARCH_MARKER = '[[[SEARCH]]]'
const REPLACE_MARKER = '[[[REPLACE]]]'
const FULL_MARKER = '[[[FULL]]]'
const MARKER_PREFIX = '[[['

export class FieldStreamParser {
  private buffer = ''
  private state: State = 'IDLE'
  private fieldIndex = -1
  private fieldMode: 'full' | 'patch' | null = null
  private currentValue = ''
  private currentSearch = ''
  private stripLeadingNewline = false

  /**
   * Feed a text chunk and return any events produced.
   */
  feed(text: string): ParserEvent[] {
    this.buffer += text
    const events: ParserEvent[] = []

    // Strip leading newline after marker if flagged from a previous feed().
    if (this.stripLeadingNewline && this.buffer.length > 0) {
      if (this.buffer[0] === '\n') {
        this.buffer = this.buffer.slice(1)
      }
      this.stripLeadingNewline = false
    }

    // Each branch either consumes part of the buffer and loops (`continue`) or
    // breaks to wait for more data / finish. Every loop-back path shrinks the
    // buffer, so the loop always terminates.
    while (true) {
      // Look for any marker starting with '[[['.
      const markerPos = this.buffer.indexOf(MARKER_PREFIX)

      if (markerPos === -1) {
        // No marker prefix found. Emit buffered content as delta,
        // keeping a tail for potential partial markers.
        this.emitBufferedContent(events, this.buffer.length)
        break
      }

      // There's content before the marker — emit it first.
      if (markerPos > 0) {
        const before = this.buffer.slice(0, markerPos)
        this.buffer = this.buffer.slice(markerPos)
        this.appendContent(before, events)
        continue
      }

      // Buffer starts with '[[['. Try to match a complete marker.
      const matched = this.tryMatchMarker(events)
      if (matched) {
        continue
      }

      // Could be a partial marker. If buffer is long enough that it can't
      // be a valid marker prefix, emit the first chars as content and retry.
      if (this.buffer.length >= MAX_MARKER_LENGTH) {
        // Not a valid marker — emit the '[[[' as content.
        const chunk = this.buffer.slice(0, 3)
        this.buffer = this.buffer.slice(3)
        this.appendContent(chunk, events)
        continue
      }

      // Wait for more data.
      break
    }

    return events
  }

  /**
   * Call when the stream ends to close any open state.
   */
  flush(): ParserEvent[] {
    const events: ParserEvent[] = []

    // Process any remaining buffer content.
    if (this.buffer.length > 0) {
      this.appendContent(this.buffer, events)
      this.buffer = ''
    }

    // Close open operation/field.
    this.closeCurrentState(events)

    return events
  }

  /**
   * Try to match a marker at the start of the buffer.
   * Returns true if a marker was consumed.
   */
  private tryMatchMarker(events: ParserEvent[]): boolean {
    // Try [[[FIELD:N]]]
    const fieldMatch = this.buffer.match(FIELD_RE)
    if (fieldMatch) {
      const fullMarker = fieldMatch[0]
      const newIndex = parseInt(fieldMatch[1], 10)

      // Close any open state for the previous field.
      this.closeCurrentState(events)

      this.fieldIndex = newIndex
      this.fieldMode = null
      this.state = 'FIELD_START'
      this.currentValue = ''
      this.currentSearch = ''

      this.consumeMarker(fullMarker.length)
      return true
    }

    // Try [[[SEARCH]]]
    if (this.buffer.startsWith(SEARCH_MARKER)) {
      if (this.state === 'IN_REPLACE') {
        // Close previous operation.
        events.push({
          type: 'operation_end',
          index: this.fieldIndex,
          search: this.currentSearch,
          replace: this.trimTrailingNewline(this.currentValue),
        })
      }

      if (this.fieldMode === null) {
        this.fieldMode = 'patch'
        events.push({
          type: 'field_start',
          index: this.fieldIndex,
          mode: 'patch',
        })
      }

      this.state = 'IN_SEARCH'
      this.currentSearch = ''
      this.currentValue = ''

      this.consumeMarker(SEARCH_MARKER.length)
      return true
    }

    // Try [[[REPLACE]]]
    if (this.buffer.startsWith(REPLACE_MARKER)) {
      // Finalize the search text.
      this.currentSearch = this.trimTrailingNewline(this.currentSearch)
      this.state = 'IN_REPLACE'
      this.currentValue = ''

      this.consumeMarker(REPLACE_MARKER.length)
      return true
    }

    // Try [[[FULL]]]
    if (this.buffer.startsWith(FULL_MARKER)) {
      if (this.fieldMode === null) {
        this.fieldMode = 'full'
        events.push({
          type: 'field_start',
          index: this.fieldIndex,
          mode: 'full',
        })
      }

      this.state = 'IN_FULL'
      this.currentValue = ''

      this.consumeMarker(FULL_MARKER.length)
      return true
    }

    return false
  }

  /**
   * Consume a marker from the buffer, stripping the optional newline after it.
   */
  private consumeMarker(length: number): void {
    this.buffer = this.buffer.slice(length)
    if (this.buffer.length > 0 && this.buffer[0] === '\n') {
      this.buffer = this.buffer.slice(1)
    } else if (this.buffer.length === 0) {
      this.stripLeadingNewline = true
    }
  }

  /**
   * Append content to the current accumulator and emit deltas.
   */
  private appendContent(text: string, events: ParserEvent[]): void {
    switch (this.state) {
      case 'IN_FULL':
        this.currentValue += text
        events.push({
          type: 'full_delta',
          index: this.fieldIndex,
          value: this.currentValue,
        })
        break
      case 'IN_SEARCH':
        this.currentSearch += text
        break
      case 'IN_REPLACE':
        this.currentValue += text
        events.push({
          type: 'replace_delta',
          index: this.fieldIndex,
          search: this.currentSearch,
          value: this.currentValue,
        })
        break
      case 'IDLE':
      case 'FIELD_START':
        // Discard preamble or content between FIELD and mode marker.
        break
    }
  }

  /**
   * Emit buffered content as delta, keeping a tail for partial markers.
   * Returns true if content was emitted.
   */
  private emitBufferedContent(
    events: ParserEvent[],
    bufferLength: number,
  ): boolean {
    if (this.state === 'IDLE' || this.state === 'FIELD_START') {
      // Discard content outside of fields or between field header and mode.
      const keep = MAX_MARKER_LENGTH - 1
      if (this.buffer.length > keep) {
        this.buffer = this.buffer.slice(this.buffer.length - keep)
        return true
      }
      return false
    }

    const safeLength = Math.max(0, bufferLength - (MAX_MARKER_LENGTH - 1))
    if (safeLength > 0) {
      const chunk = this.buffer.slice(0, safeLength)
      this.buffer = this.buffer.slice(safeLength)
      this.appendContent(chunk, events)
      return true
    }
    return false
  }

  /**
   * Close any open operation or field, emitting the appropriate events.
   */
  private closeCurrentState(events: ParserEvent[]): void {
    if (this.state === 'IN_REPLACE') {
      events.push({
        type: 'operation_end',
        index: this.fieldIndex,
        search: this.currentSearch,
        replace: this.trimTrailingNewline(this.currentValue),
      })
    }

    if (this.state === 'IN_FULL') {
      // Trim trailing newline from full value.
      this.currentValue = this.trimTrailingNewline(this.currentValue)
    }

    if (this.fieldIndex >= 0 && this.fieldMode !== null) {
      events.push({
        type: 'field_end',
        index: this.fieldIndex,
      })
    }

    this.state = 'IDLE'
    this.fieldMode = null
  }

  private trimTrailingNewline(s: string): string {
    if (s.endsWith('\n')) {
      return s.slice(0, -1)
    }
    return s
  }
}
