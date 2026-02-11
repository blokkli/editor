import imageUrl from './images/two_columns.png?url'
import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Paragraph } from './Paragraph'

export class ParagraphTwoColumns extends Paragraph {
  static override bundle = 'two_columns'
  static override label = 'Two Columns'
  static override description =
    'A two-column layout with header and left/right content areas.'
  static override imageUrl = imageUrl

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('header', 'Header', 1, false, ['title', 'text']),
      new FieldBlocks('left', 'Left', -1, true, [
        'text',
        'title',
        'button',
        'card',
        'from_library',
        'button_list',
      ]),
      new FieldBlocks('right', 'Right', -1, true, [
        'image',
        'card',
        'text',
        'title',
      ]),
    ]
  }
}
