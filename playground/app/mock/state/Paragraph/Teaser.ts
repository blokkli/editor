import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { FieldTextarea } from '../Field/Textarea'
import { Paragraph } from './Paragraph'

export class ParagraphTeaser extends Paragraph {
  static override bundle = 'teaser'
  static override label = 'Teaser'
  static override description = 'A linked teaser with title, text, and URL.'
  static override isTranslatable = true

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldText('url', 'Url', 1, false, -1, false),
      new FieldTextarea('text', 'Text'),
    ]
  }
}
