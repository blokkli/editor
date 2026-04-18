import type { Field } from '../Field'
import { FieldReference } from '../Field/Reference'
import { Paragraph } from './Paragraph'

export class ParagraphGallery extends Paragraph {
  static override bundle = 'gallery'
  static override label = 'Gallery'
  static override description = 'Displays a gallery of images.'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldReference('images', 'Images', 4, false, 'media', ['image']),
    ]
  }

  static override getDefaultValues(): Record<string, any> {
    return {
      ...super.getDefaultValues(),
      images: ['7', '10'],
    }
  }
}
