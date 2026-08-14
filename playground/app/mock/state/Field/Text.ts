import { Field, type FieldTextEntry } from '../Field'

/**
 * Simulate CMS text processing: apply typographic transformations.
 * Converts ASCII patterns to their Unicode equivalents.
 * This is NOT idempotent for detection purposes: if processed text is saved
 * back, the raw value changes (e.g., `--` becomes `—`), which means the
 * original authoring marks are lost.
 */
function processPlainText(raw: string): string {
  return raw.replace(/--/g, '\u2014').replace(/\.\.\./g, '\u2026')
}

export class FieldText extends Field<string> {
  maxLength: number

  constructor(
    id: string,
    label: string,
    cardinality = 1,
    required = false,
    maxLength = -1,
    isTranslatable = true,
  ) {
    super('text', id, label, cardinality, required, isTranslatable)
    this.maxLength = maxLength
  }

  /**
   * Return the processed (display-ready) value.
   * Applies typographic transformations (e.g., `--` → `—`).
   */
  getText(): string {
    return processPlainText(this.list[0] || '')
  }

  /**
   * Return the raw stored value without any processing.
   * Use this for adapter/API responses where the backend needs the original.
   */
  getUnprocessed(): string {
    return this.list[0] || ''
  }

  /**
   * Block props render the processed value, exactly like a real CMS renders
   * filtered text. Overriding the per-item hook (instead of getPropValue())
   * keeps the base class' cardinality handling intact.
   */
  override getPropValueItem(v: string): string {
    return processPlainText(v)
  }

  override getTextEntries(): FieldTextEntry[] {
    return [
      {
        path: this.id,
        label: this.label,
        value: this.getUnprocessed(),
        fieldType: 'plain',
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
