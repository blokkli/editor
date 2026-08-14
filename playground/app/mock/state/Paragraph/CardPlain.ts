import { LOREM_LEAD, LOREM_TITLE } from '../../defaultText'
import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { Paragraph } from './Paragraph'

/**
 * A card whose text fields are NOT annotated with the editable directive.
 *
 * Deliberately the odd one out: every other block renders its editable fields
 * through `v-blokkli-editable`, so their highlights, previews and inline edits
 * all have an element to attach to. This one declares both fields only through
 * `propsFieldMapping`, which is the case that has to keep working for projects
 * that never got around to annotating — and the only fixture that can produce
 * more than one element-less field on a single block.
 */
export class ParagraphCardPlain extends Paragraph {
  static override bundle = 'card_plain'
  static override label = 'Card (unannotated)'
  static override description =
    'A card whose fields are mapped through props only, with no editable directive.'

  static override isTranslatable = true

  static override getDefaultValues(): Record<string, any> {
    return {
      ...super.getDefaultValues(),
      title: LOREM_TITLE,
      text: LOREM_LEAD,
    }
  }

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldText('text', 'Text'),
    ]
  }

  title(): FieldText {
    return this.get('title')
  }

  text(): FieldText {
    return this.get('text')
  }
}
