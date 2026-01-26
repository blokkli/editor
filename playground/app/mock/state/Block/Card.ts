import { LOREM_LEAD, LOREM_TITLE } from '../../defaultText'
import type { Field } from '../Field'
import { FieldIcon } from '../Field/Icon'
import { FieldText } from '../Field/Text'
import { Block } from './Block'
import imageUrl from './images/card.png?url'

export class BlockCard extends Block {
  static override bundle = 'card'
  static override label = 'Card'
  static override description = 'A content card with icon, title, and text.'
  static override allowReusable = true
  static override isTranslatable = true
  static override imageUrl = imageUrl

  static override getDefaultValues(): Record<string, any> {
    return {
      ...super.getDefaultValues(),
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

  text(): FieldText {
    return this.get('text')
  }

  title(): FieldText {
    return this.get('title')
  }
}
