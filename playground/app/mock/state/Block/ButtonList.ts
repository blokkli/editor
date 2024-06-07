import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Block } from './Block'

export class BlockButtonList extends Block {
  static bundle = 'button_list'
  static label = 'Button List'
  static isTranslatable = true

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('blocks', 'Buttons', -1, false, ['button']),
    ]
  }

  blocks(): FieldBlocks {
    return this.get('blocks')
  }
}
