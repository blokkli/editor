import { Field } from '../Field'

/**
 * Simulate CMS markup processing: add a `data-bk-processed` attribute to
 * block-level HTML elements. This simulates server-side text filters that
 * inject attributes during rendering.
 *
 * Crucially, this is NOT idempotent: if processed markup is saved back and
 * processed again, every block element gets a duplicate attribute
 * (`<p data-bk-processed data-bk-processed>`), making the corruption
 * immediately visible.
 */
function processMarkup(raw: string): string {
  return raw.replace(
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
  ) {
    super('textarea', id, label, cardinality, required)
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
