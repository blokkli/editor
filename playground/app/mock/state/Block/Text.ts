import type { Field } from '../Field'
import { FieldTextarea } from '../Field/Textarea'
import { Block } from './Block'

export class BlockText extends Block {
  static bundle = 'text'
  static label = 'Text'

  static getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldTextarea('text', 'Text')]
  }

  text(): FieldTextarea {
    return this.get('text')
  }
}
