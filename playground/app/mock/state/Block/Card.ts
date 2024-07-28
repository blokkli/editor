import { LOREM_LEAD, LOREM_TITLE } from '../../defaultText'
import type { Field } from '../Field'
import { FieldIcon } from '../Field/Icon'
import { FieldText } from '../Field/Text'
import { Block } from './Block'

export class BlockCard extends Block {
  static override bundle = 'card'
  static override label = 'Card'
  static override allowReusable = true
  static override isTranslatable = true

  static override getDefaultValues(): Record<string, any> {
    return {
      text: LOREM_LEAD,
      title: LOREM_TITLE,
    }
  }

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldIcon('icon', 'Icon'),
      new FieldText('title', 'Title'),
      new FieldText('text', 'Text'),
    ]
  }
}
