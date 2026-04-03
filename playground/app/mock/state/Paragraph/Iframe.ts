import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { Paragraph } from './Paragraph'

export class ParagraphIframe extends Paragraph {
  static override bundle = 'iframe'
  static override label = 'Iframe'
  static override description = 'An embedded iframe with responsive heights.'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('url', 'URL', 1, false, -1, false),
    ]
  }

  static override getDefaultValues(): Record<string, any> {
    return {
      ...super.getDefaultValues(),
      url: 'https://example.com',
    }
  }
}
