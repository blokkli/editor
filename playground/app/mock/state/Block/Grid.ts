import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Block } from './Block'
import imageUrl from './images/grid.png?url'

export class BlockGrid extends Block {
  static override bundle = 'grid'
  static override label = 'Grid'
  static override description = `<p>A section to render a title and a grid of blocks.</p><p>Use this block to place 2 or more child blocks (such as cards, text) in a grid. The grid can either be 2 or 3 columns.</p>`
  static override imageUrl = imageUrl

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('header', 'Header', 1, false, ['title', 'text']),
      new FieldBlocks('blocks', 'Blocks', -1, false, [
        'teaser',
        'card',
        'text',
        'from_library',
        'blokkli_fragment',
        'video',
        'image',
      ]),
    ]
  }

  blocks(): FieldBlocks {
    return this.get('blocks')
  }
}
