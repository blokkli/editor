import { LOREM_LEAD, LOREM_TITLE } from '../../defaultText'
import type { Field } from '../Field'
import { FieldIcon } from '../Field/Icon'
import { FieldText } from '../Field/Text'
import { FieldTextarea } from '../Field/Textarea'
import { Block } from './Block'

export class BlockCard extends Block {
  static bundle = 'card'
  static label = 'Card'
  static allowReusable = true

  static getDefaultValues(): Record<string, any> {
    return {
      text: LOREM_LEAD,
      title: LOREM_TITLE,
    }
  }

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldIcon('icon', 'Icon'),
      new FieldText('title', 'Title'),
      new FieldTextarea('text', 'Text'),
    ]
  }
}
