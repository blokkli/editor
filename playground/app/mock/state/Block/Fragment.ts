import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { Block } from './Block'

export class BlockFragment extends Block {
  static bundle = 'blokkli_fragment'
  static label = 'Fragment'
  static allowReusable = true
  static isTranslatable = true

  static getDefaultValues(): Record<string, any> {
    return {}
  }

  static getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldText('name', 'Name')]
  }
}
