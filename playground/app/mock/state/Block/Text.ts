import { LOREM_TEXT } from '../../defaultText'
import type { Field } from '../Field'
import { FieldTextarea } from '../Field/Textarea'
import { Block } from './Block'

export class BlockText extends Block {
  static bundle = 'text'
  static label = 'Text'

  static getDefaultValues(): Record<string, any> {
    return {
      text: `<p>${LOREM_TEXT}</p>`,
    }
  }

  static getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldTextarea('text', 'Text')]
  }

  text(): FieldTextarea {
    return this.get('text')
  }
}
