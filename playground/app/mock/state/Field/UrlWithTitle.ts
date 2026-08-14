import { Field, type FieldTextEntry } from '../Field'

/** One link item: where it points and what it reads as. */
export type LinkValue = {
  uri: string
  title: string
}

/**
 * A link whose title lives INSIDE the field value.
 *
 * This models Drupal's `field_link`, where `title` is a property of the link
 * item rather than a field of its own. `ParagraphButton` takes the other shape
 * — separate `title` (FieldText) and `url` (FieldUrl) fields — and translates
 * fine precisely because its title is an ordinary text field.
 *
 * The distinction matters because `Entity.getTextFields()` only returns
 * `FieldText`/`FieldTextarea`. Everything built on top of it — the adapter's
 * `textFieldValues`, the agent's raw read path, and
 * `loadTextFieldValuesForLanguage` (the source of every translation flow) —
 * therefore cannot see a link title at all.
 */
export class FieldUrlWithTitle extends Field<LinkValue> {
  constructor(
    id: string,
    label: string,
    cardinality = 1,
    required = false,
    isTranslatable = true,
  ) {
    super('url_with_title', id, label, cardinality, required, isTranslatable)
  }

  getUri(): string {
    return this.list[0]?.uri ?? ''
  }

  getTitle(): string {
    return this.list[0]?.title ?? ''
  }

  /**
   * Set the title, keeping the URI. A link title is plain text in Drupal (no
   * text format), so unlike `FieldText` there is no render-time processing to
   * simulate here.
   */
  setTitle(title: string) {
    const current = this.list[0]
    if (!current) {
      this.list[0] = { uri: '', title }
      return
    }
    this.list[0] = { ...current, title }
  }

  setUri(uri: string) {
    const current = this.list[0]
    if (!current) {
      this.list[0] = { uri, title: '' }
      return
    }
    this.list[0] = { ...current, uri }
  }

  /**
   * The title is translatable text; the uri is a link target and is edited by
   * dropping onto the field, not by rewriting prose. So only `title` is
   * exposed here.
   */
  override getTextEntries(): FieldTextEntry[] {
    return [
      {
        path: `${this.id}.title`,
        label: `${this.label} title`,
        value: this.getTitle(),
        fieldType: 'plain',
        maxLength: -1,
        isTranslatable: this.isTranslatable,
      },
    ]
  }

  override setTextValue(property: string | null, value: string): void {
    if (property === 'title') {
      this.setTitle(value)
    }
  }

  override toString(): string {
    return this.getUri()
  }
}
