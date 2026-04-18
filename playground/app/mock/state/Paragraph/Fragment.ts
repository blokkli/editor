import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { Paragraph } from './Paragraph'

export class ParagraphFragment extends Paragraph {
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
    return [
      ...super.getFieldDefintions(),
      new FieldText('name', 'Name', 1, false, -1, false),
    ]
  }
}
