import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Block } from './Block'

export class BlockTwoColumns extends Block {
  static override bundle = 'two_columns'
  static override label = 'Two Columns'

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
