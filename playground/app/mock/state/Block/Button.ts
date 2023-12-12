import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { FieldUrl } from '../Field/Url'
import { Block } from './Block'

export class BlockButton extends Block {
  static bundle = 'button'
  static label = 'Button'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldUrl('url', 'URL'),
    ]
  }
}
