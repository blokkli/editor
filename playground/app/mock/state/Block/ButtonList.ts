import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Block } from './Block'

export class BlockButtonList extends Block {
  static override bundle = 'button_list'
  static override label = 'Button List'
  static override isTranslatable = true

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('blocks', 'Buttons', -1, false, ['button']),
    ]
  }

  blocks(): FieldBlocks {
    return this.get('blocks')
  }
}
