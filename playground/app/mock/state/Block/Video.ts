import type { Field } from '../Field'
import { FieldReference } from '../Field/Reference'
import { Block } from './Block'

export class BlockVideo extends Block {
  static bundle = 'video'
  static label = 'Video'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldReference('video', 'Video', 1, 'media', ['video']),
    ]
  }
}
