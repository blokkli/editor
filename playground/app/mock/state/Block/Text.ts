import { LOREM_TEXT } from '../../defaultText'
import type { Field } from '../Field'
import { FieldTextarea } from '../Field/Textarea'
import { Block } from './Block'

export class BlockText extends Block {
  static override bundle = 'text'
  static override label = 'Text'
  static override allowReusable = true
  static override isTranslatable = true

  static override getDefaultValues(): Record<string, any> {
    return {
      text: `<p>${LOREM_TEXT}</p>`,
    }
  }

  static override getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldTextarea('text', 'Text')]
  }

  text(): FieldTextarea {
    return this.get('text')
  }
}
