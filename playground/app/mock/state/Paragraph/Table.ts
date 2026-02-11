import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { Paragraph } from './Paragraph'
import imageUrl from './images/table.png?url'

export class ParagraphTable extends Paragraph {
  static override bundle = 'table'
  static override label = 'Table'
  static override description = 'A table displaying data in rows and columns.'
  static override imageUrl = imageUrl

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('rows', 'Rows', -1, false, ['title']),
    ]
  }

  rows(): FieldBlocks {
    return this.get('rows')
  }
}
