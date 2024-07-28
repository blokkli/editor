import { Entity } from './Entity'
import type { Field } from './Field'
import { FieldBlocks } from './Field/Blocks'
import { FieldText } from './Field/Text'

export class LibraryItem extends Entity {
  static override entityType = 'library_item'
  static override bundle = 'library_item'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldBlocks('blocks', 'Blocks', 1, true, []),
    ]
  }

  getBlocks(): FieldBlocks {
    return this.get('blocks')
  }

  title(): string {
    return this.get<FieldText>('title').getText()
  }
}
