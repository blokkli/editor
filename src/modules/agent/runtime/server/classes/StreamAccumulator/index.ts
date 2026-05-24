import type { GenericContentBlock } from '../../../shared/types'
import { transformText } from '../../helpers/text'

/**
 * The outcome of finalizing a streamed tool_use block.
 * `ok: false` means the model produced malformed JSON input — the tool_use block
 * is still recorded (so the assistant message stays structurally valid), but the
 * caller should return an error tool_result rather than dispatch the tool.
 */
export type FinishedToolUse =
  | {
      ok: true
      id: string
      name: string
      input: Record<string, unknown>
      /** Raw concatenated input JSON — used for repeated-call detection. */
      inputJson: string
    }
  | { ok: false; id: string; name: string }

/**
 * Turns a provider's stream of delta events (`text_*` / `tool_use_*`) into the
 * completed content blocks of a single assistant turn.
 *
 * This is the pure, side-effect-free state machine extracted from `runAgentLoop`:
 * it owns the in-progress text/tool_use buffers and the resulting block array,
 * while the caller keeps the I/O concerns (streaming deltas to the client,
 * dispatching tools, retry/repeat detection).
 */
export class StreamAccumulator {
  private readonly _blocks: GenericContentBlock[] = []
  private currentText = ''
  private inText = false
  private toolUse: { id: string; name: string; inputJson: string } | null = null

  /**
   * Live array of completed content blocks for the current turn. The caller may
   * append to it directly (e.g. reasoning blocks) and reset it (`.length = 0`)
   * when committing messages early — the accumulator keeps appending afterwards.
   */
  get blocks(): GenericContentBlock[] {
    return this._blocks
  }

  startText(): void {
    this.inText = true
    this.currentText = ''
  }

  /**
   * Accumulate a raw text delta and return its transformed form for the caller
   * to stream to the client. Returns `null` when no text block is open (the
   * delta is ignored, matching the original `if (inTextBlock)` guard).
   */
  pushTextDelta(raw: string): string | null {
    if (!this.inText) return null
    const transformed = transformText(raw)
    this.currentText += transformed
    return transformed
  }

  /** Finalize the open text block, recording it only if it has content. */
  endText(): void {
    if (this.inText && this.currentText) {
      this._blocks.push({ type: 'text', text: this.currentText })
    }
    this.currentText = ''
    this.inText = false
  }

  startToolUse(id: string, name: string): void {
    this.toolUse = { id, name, inputJson: '' }
  }

  pushToolUseDelta(partialJson: string): void {
    if (this.toolUse) {
      this.toolUse.inputJson += partialJson
    }
  }

  /**
   * Finalize the open tool_use block: parse its accumulated JSON input, always
   * record the tool_use block (so the assistant message stays valid even on
   * malformed input), and return the parse outcome. Returns `null` if no tool_use
   * was open.
   */
  finishToolUse(): FinishedToolUse | null {
    const tu = this.toolUse
    if (!tu) return null
    this.toolUse = null

    let input: Record<string, unknown>
    let ok = true
    try {
      input = JSON.parse(tu.inputJson || '{}')
    } catch {
      input = {}
      ok = false
    }

    // Record the tool_use block regardless of parse success.
    this._blocks.push({
      type: 'tool_use',
      id: tu.id,
      name: tu.name,
      input,
    })

    return ok
      ? { ok: true, id: tu.id, name: tu.name, input, inputJson: tu.inputJson }
      : { ok: false, id: tu.id, name: tu.name }
  }
}
