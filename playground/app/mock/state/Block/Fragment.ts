import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { Block } from './Block'

export class BlockFragment extends Block {
  static override bundle = 'blokkli_fragment'
  static override label = 'Fragment'
  static override description = 'A reusable fragment defined in code.'
  static override allowReusable = false
  static override isTranslatable = false

  static override getDefaultValues(): Record<string, any> {
    return {
      ...super.getDefaultValues(),
    }
  }

  static override getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldText('name', 'Name')]
  }
}
