import { mapMockField } from '../../state'
import type { Field } from '../Field'
import { FieldReference } from '../Field/Reference'
import type { LibraryItem } from '../LibraryItem'
import { Block } from './Block'

export class BlockFromLibrary extends Block {
  static bundle = 'from_library'
  static label = 'From Library'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldReference('libraryItem', 'Library Item', 1, 'library_item', []),
    ]
  }

  getLibraryItem(): LibraryItem | undefined {
    return this.get<FieldReference<LibraryItem>>(
      'libraryItem',
    ).getReferencedEntities()[0]
  }

  getProps() {
    const libraryItem = this.getLibraryItem()
    if (!libraryItem) {
      return {}
    }
    const blocks = libraryItem.getBlocks()

    return {
      libraryItem: {
        field: {
          list: mapMockField(blocks).list,
        },
      },
    }
  }
}
