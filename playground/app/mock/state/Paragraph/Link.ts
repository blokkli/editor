import type { Field } from '../Field'
import { FieldUrlWithTitle } from '../Field/UrlWithTitle'
import { Paragraph } from './Paragraph'

/**
 * A link rendered from a single `field_link`-shaped field.
 *
 * Exists to exercise the case where translatable text is a PROPERTY of a
 * non-text field. Compare `ParagraphButton`, which stores the same two pieces
 * of information in separate `title` and `url` fields.
 */
export class ParagraphLink extends Paragraph {
  static override bundle = 'link'
  static override label = 'Link'
  static override description =
    'A link whose title is stored inside the link field, like Drupal’s field_link.'
  static override isTranslatable = true

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldUrlWithTitle('link', 'Link'),
    ]
  }

  static override getDefaultValues(): Record<string, any> {
    return {
      ...super.getDefaultValues(),
      link: {
        uri: 'https://www.example.com',
        title: 'Read more about it',
      },
    }
  }

  link(): FieldUrlWithTitle {
    return this.get<FieldUrlWithTitle>('link')
  }

  getLinkTitle(): string {
    return this.link().getTitle()
  }

  getLinkUri(): string {
    return this.link().getUri()
  }
}
