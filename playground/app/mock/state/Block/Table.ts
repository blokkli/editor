import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Block } from './Block'

export class BlockTable extends Block {
  static bundle = 'table'
  static label = 'Table'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('rows', 'Rows', -1, false, ['title']),
    ]
  }

  rows(): FieldBlocks {
    return this.get('rows')
  }
}
