import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Paragraph } from './Paragraph'
import imageUrl from './images/slider.png?url'

export class ParagraphSlider extends Paragraph {
  static override bundle = 'slider'
  static override label = 'Slider'
  static override description =
    'A carousel component for displaying multiple slides.'
  static override imageUrl = imageUrl

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('slides', 'Slides', -1, true, [
        'two_columns',
        'grid',
        'image',
        'card',
        'from_library',
      ]),
    ]
  }
}
