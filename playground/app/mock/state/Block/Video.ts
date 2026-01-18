import type { Field } from '../Field'
import { FieldReference } from '../Field/Reference'
import { Block } from './Block'

export class BlockVideo extends Block {
  static override bundle = 'video'
  static override label = 'Video'
  static override description = 'Displays a video from the media library.'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldReference('video', 'Video', 1, true, 'media', ['video']),
    ]
  }
}
