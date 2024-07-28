import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { FieldReference } from '../Field/Reference'
import { FieldText } from '../Field/Text'
import type { MediaImage } from '../Media/Media'

export abstract class Content extends Entity {
  static override entityType = 'content'

  static override getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldText('title', 'Title')]
  }

  title(): FieldText {
    return this.get('title')
  }
}

export class ContentPage extends Content {
  static override bundle = 'page'
  static override label = 'Page'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('content', 'Content', -1, false, [
        'text',
        'title',
        'grid',
        'two_columns',
        'button',
        'card',
        'image',
        'from_library',
        'blokkli_fragment',
        'video',
        'table',
        'on_this_page',
        'widget',
      ]),
      new FieldBlocks('buttons', 'Buttons', 3, false, ['button']),
      new FieldBlocks('icons', 'Icons', 9, false, ['icon']),
      new FieldReference('heroImage', 'Hero Image', 1, false, 'media', [
        'image',
      ]),
      new FieldText('lead', 'Lead'),
    ]
  }

  content(): FieldBlocks {
    return this.get('content')
  }

  buttons(): FieldBlocks {
    return this.get('buttons')
  }

  icons(): FieldBlocks {
    return this.get('icons')
  }

  lead(): FieldText {
    return this.get('lead')
  }

  heroImage(): MediaImage | undefined {
    const field = this.get('heroImage') as FieldReference<MediaImage>
    const entities = field.getReferencedEntities()
    return entities[0]
  }

  override getData() {
    return {
      title: this.title().getText(),
      lead: this.lead().getText(),
      heroImage: this.heroImage()?.getData(),
    }
  }
}

export const getContentBundles = (): Array<typeof Content> => {
  return [ContentPage]
}
