import { Field, type FieldTextEntry } from '../Field'

/**
 * Simulate the three things a CMS text filter actually does while rendering,
 * each detectable through a different read path:
 *
 * 1. **Rewrites attributes** — `/node/123` resolved to its path alias. Only
 *    visible in `innerHTML`; survives a Markdown conversion as a link target.
 * 2. **Inserts nodes** — the "opens in a new tab" hint Drupal appends after
 *    external links. This is the case that motivated all of this, and the only
 *    one visible to `textContent`, turndown and readability chunking.
 * 3. **Injects attributes** — `data-bk-processed` on block elements. Invisible
 *    to text extraction, so it alone cannot catch a `textContent`-based read.
 *
 * None of it is idempotent: processed markup fed back through gains a second
 * `data-bk-processed`, a second hint span and an `/alias-alias-` href, so
 * round-tripped corruption compounds visibly instead of hiding.
 */
function processMarkup(raw: string): string {
  return raw
    .replace(/href="\/node\/(\d+)"/g, 'href="/alias-$1"')
    .replace(
      /(<a\b[^>]*target="_blank"[^>]*>.*?<\/a>)/g,
      '$1<span class="bk-ext"> (opens in a new tab)</span>',
    )
    .replace(
      /<(p|h[1-6]|ul|ol|li|blockquote)([\s>])/g,
      '<$1 data-bk-processed$2',
    )
}

export class FieldTextarea extends Field<string> {
  maxLength: number

  constructor(
    id: string,
    label: string,
    cardinality = 1,
    required = false,
    maxLength = -1,
    isTranslatable = true,
  ) {
    super('textarea', id, label, cardinality, required, isTranslatable)
    this.maxLength = maxLength
  }

  /**
   * Return the processed (display-ready) markup.
   * Adds `data-bk-processed` to block-level HTML elements.
   */
  getText(): string {
    return processMarkup(this.list[0] || '')
  }

  /**
   * Return the raw stored value without any processing.
   * Use this for adapter/API responses where the backend needs the original.
   */
  getUnprocessed(): string {
    return this.list[0] || ''
  }

  /**
   * Block props render the processed markup, exactly like a real CMS renders
   * filtered text. Overriding the per-item hook (instead of getPropValue())
   * keeps the base class' cardinality handling intact.
   */
  override getPropValueItem(v: string): string {
    return processMarkup(v)
  }

  override getTextEntries(): FieldTextEntry[] {
    return [
      {
        path: this.id,
        label: this.label,
        value: this.getUnprocessed(),
        fieldType: 'markup',
        maxLength: this.maxLength,
        isTranslatable: this.isTranslatable,
      },
    ]
  }

  setText(text: string) {
    if (!this.list.length) {
      this.append(text)
      return
    }
    this.list[0] = text
  }

  override toString() {
    return this.getText()
  }
}
