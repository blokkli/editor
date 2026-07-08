import { LOREM_SHORT } from '../../defaultText'
import type { Field } from '../Field'
import { FieldIcon } from '../Field/Icon'
import { FieldText } from '../Field/Text'
import { FieldUrl } from '../Field/Url'
import type { EntityValidation } from '../Validation'
import { Paragraph } from './Paragraph'
import imageUrl from './images/button.png?url'

export class ParagraphButton extends Paragraph {
  static override bundle = 'button'
  static override label = 'Button'
  static override description =
    'A call-to-action button with title, URL, and optional icon.'
  static override isTranslatable = true
  static override imageUrl = imageUrl

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldUrl('url', 'URL', 1, true),
      new FieldIcon('icon', 'Icon'),
    ]
  }

  static override getDefaultValues(): Record<string, any> {
    return {
      ...super.getDefaultValues(),
      title: LOREM_SHORT,
      url: 'https://www.example.com',
    }
  }

  getTitle() {
    return this.get<FieldText>('title').getText()
  }

  getUrl() {
    return this.get<FieldUrl>('url').toString()
  }

  override validate(): EntityValidation[] {
    if (this.getUrl().includes('google.com')) {
      return [
        {
          propertyPath: 'url',
          message: `Linking to google.com is not allowed.`,
        },
      ]
    }

    return []
  }
}
