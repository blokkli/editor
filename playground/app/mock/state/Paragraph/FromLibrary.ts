import { mapMockField } from '../../state'
import type { Field } from '../Field'
import { FieldReference } from '../Field/Reference'
import type { LibraryItem } from '../LibraryItem'
import { Paragraph } from './Paragraph'

export class ParagraphFromLibrary extends Paragraph {
  static override bundle = 'from_library'
  static override label = 'From Library'
  static override description = 'References a reusable block from the library.'
  static override allowReusable = false

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldReference(
        'libraryItem',
        'Library Item',
        1,
        true,
        'library_item',
        [],
      ),
    ]
  }

  getLibraryItem(): LibraryItem | undefined {
    return this.get<FieldReference<LibraryItem>>(
      'libraryItem',
    ).getReferencedEntities()[0]
  }

  override getProps() {
    const libraryItem = this.getLibraryItem()
    if (!libraryItem) {
      return {}
    }
    const blocks = libraryItem.getBlocks()

    return {
      libraryItem: {
        uuid: libraryItem.uuid,
        block: mapMockField(blocks)[0],
        label: libraryItem.title(),
      },
    }
  }
}
