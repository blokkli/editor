import type { Block } from './Block/Block'
import { Entity } from './Entity'
import type { Field } from './Field'
import { FieldBlocks } from './Field/Blocks'
import { FieldText } from './Field/Text'

export class LibraryItem extends Entity {
  static entityType = 'library_item'
  static bundle = 'library_item'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldBlocks('blocks', 'Blocks', 1, []),
    ]
  }

  getBlocks(): FieldBlocks {
    return this.get('blocks')
  }

  title(): string {
    return this.get<FieldText>('title').getText()
  }
}
