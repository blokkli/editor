import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Block } from './Block'

export class BlockTwoColumns extends Block {
  static bundle = 'two_columns'
  static label = 'Two Columns'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('header', 'Header', 1, ['title']),
      new FieldBlocks('left', 'Left', -1, ['text', 'title', 'button', 'card']),
      new FieldBlocks('right', 'Right', -1, ['image']),
    ]
  }
}
