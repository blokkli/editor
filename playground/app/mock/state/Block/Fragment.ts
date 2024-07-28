import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { Block } from './Block'

export class BlockFragment extends Block {
  static override bundle = 'blokkli_fragment'
  static override label = 'Fragment'
  static override allowReusable = true
  static override isTranslatable = true

  static override getDefaultValues(): Record<string, any> {
    return {}
  }

  static override getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldText('name', 'Name')]
  }
}
