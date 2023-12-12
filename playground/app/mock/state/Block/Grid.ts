import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Block } from './Block'

export class BlockGrid extends Block {
  static bundle = 'grid'
  static label = 'Grid'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('header', 'Header', 1, ['title']),
      new FieldBlocks('blocks', 'Blocks', -1, ['teaser', 'card']),
    ]
  }

  blocks(): FieldBlocks {
    return this.get('blocks')
  }
}
