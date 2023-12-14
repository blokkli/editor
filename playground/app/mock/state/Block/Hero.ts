import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { FieldText } from '../Field/Text'
import { FieldTextarea } from '../Field/Textarea'
import { Block } from './Block'

export class BlockHero extends Block {
  static bundle = 'hero'
  static label = 'Hero'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldTextarea('lead', 'Lead'),
      new FieldBlocks('buttons', 'Buttons', 3, ['button']),
    ]
  }
}
