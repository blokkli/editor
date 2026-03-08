import imageUrl from './images/title.png?url'
import { LOREM_LEAD, LOREM_TITLE } from '../../defaultText'
import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { Paragraph } from './Paragraph'

export class ParagraphTitle extends Paragraph {
  static override bundle = 'title'
  static override label = 'Title'
  static override description =
    'A section header with tagline, title, and lead text.'
  static override allowReusable = true
  static override isTranslatable = true
  static override imageUrl = imageUrl

  static override getDefaultValues(): Record<string, any> {
    return {
      ...super.getDefaultValues(),
      tagline: 'Tagline',
      title: LOREM_TITLE,
      lead: LOREM_LEAD,
    }
  }

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('tagline', 'Tagline', 1, false, 20),
      new FieldText('title', 'Title', 1, true, 50),
      new FieldText('lead', 'Lead', 1, false, 200),
    ]
  }

  title(): FieldText {
    return this.get('title')
  }

  lead(): FieldText {
    return this.get('lead')
  }
}
