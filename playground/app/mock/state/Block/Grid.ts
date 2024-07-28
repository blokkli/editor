import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Block } from './Block'

export class BlockGrid extends Block {
  static override bundle = 'grid'
  static override label = 'Grid'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('header', 'Header', 1, false, ['title']),
      new FieldBlocks('blocks', 'Blocks', -1, false, [
        'teaser',
        'card',
        'text',
        'from_library',
        'video',
        'image',
      ]),
    ]
  }

  blocks(): FieldBlocks {
    return this.get('blocks')
  }
}
