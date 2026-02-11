import type { Field } from '../Field'
import { FieldIcon } from '../Field/Icon'
import { Paragraph } from './Paragraph'
import imageUrl from './images/icon.png?url'

export class ParagraphIcon extends Paragraph {
  static override bundle = 'icon'
  static override label = 'Icon'
  static override description = 'Displays a single icon.'
  static override isTranslatable = true
  static override imageUrl = imageUrl

  static override getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldIcon('icon', 'Icon')]
  }
}
