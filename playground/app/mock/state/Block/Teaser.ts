import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { FieldTextarea } from '../Field/Textarea'
import { Block } from './Block'

export class BlockTeaser extends Block {
  static override bundle = 'teaser'
  static override label = 'Teaser'
  static override isTranslatable = true

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldText('url', 'Url'),
      new FieldTextarea('text', 'Text'),
    ]
  }
}
