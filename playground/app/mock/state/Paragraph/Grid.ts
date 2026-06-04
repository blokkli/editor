import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import type { EntityValidation } from '../Validation'
import { Paragraph } from './Paragraph'
import imageUrl from './images/grid.png?url'

export class ParagraphGrid extends Paragraph {
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

  header(): FieldBlocks {
    return this.get('header')
  }

  blocks(): FieldBlocks {
    return this.get('blocks')
  }

  override validate(): EntityValidation[] {
    const violations: EntityValidation[] = []
    if (this.header().getBlocks().length === 0) {
      violations.push({
        propertyPath: 'header',
        message: 'The grid header is required.',
      })
    }
    if (this.blocks().getBlocks().length === 0) {
      violations.push({
        propertyPath: 'blocks',
        message: 'The grid must contain at least one block.',
      })
    }
    return violations
  }
}
