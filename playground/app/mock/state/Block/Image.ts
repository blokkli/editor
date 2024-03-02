import type { Field } from '../Field'
import { FieldReference } from '../Field/Reference'
import { Block } from './Block'

export class BlockImage extends Block {
  static bundle = 'image'
  static label = 'Image'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldReference('imageReference', 'Image', 1, true, 'media', [
        'image',
      ]),
    ]
  }

  static getDefaultValues(): Record<string, any> {
    return {
      imageReference: ['7'],
    }
  }
}
