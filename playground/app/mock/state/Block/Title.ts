import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { FieldTextarea } from '../Field/Textarea'
import { Block } from './Block'

export class BlockTitle extends Block {
  static bundle = 'title'
  static label = 'Title'
  static allowReusable = true

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('tagline', 'Tagline'),
      new FieldText('title', 'Title'),
      new FieldTextarea('lead', 'Lead'),
    ]
  }

  title(): FieldText {
    return this.get('title')
  }

  lead(): FieldText {
    return this.get('lead')
  }
}
