import { LOREM_LEAD, LOREM_TITLE } from '../../defaultText'
import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { Block } from './Block'

export class BlockTitle extends Block {
  static bundle = 'title'
  static label = 'Title'
  static allowReusable = true
  static isTranslatable = true

  static getDefaultValues(): Record<string, any> {
    return {
      tagline: 'Tagline',
      title: LOREM_TITLE,
      lead: LOREM_LEAD,
    }
  }

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('tagline', 'Tagline', 1, false, 20),
      new FieldText('title', 'Title', 1, true, 50),
      new FieldText('lead', 'Lead', 1, false, 100),
    ]
  }

  title(): FieldText {
    return this.get('title')
  }

  lead(): FieldText {
    return this.get('lead')
  }
}
