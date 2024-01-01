import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { FieldTextarea } from '../Field/Textarea'
import { Block } from './Block'

export class BlockTeaser extends Block {
  static bundle = 'teaser'
  static label = 'Teaser'
  static isTranslatable = true

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldText('url', 'Url'),
      new FieldTextarea('text', 'Text'),
    ]
  }
}
