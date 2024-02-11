import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { FieldText } from '../Field/Text'

export abstract class Content extends Entity {
  static entityType = 'content'

  static getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldText('title', 'Titel')]
  }

  title(): FieldText {
    return this.get('title')
  }
}

export class ContentPage extends Content {
  static bundle = 'page'
  static label = 'Page'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBlocks('content', 'Content', -1, [
        'text',
        'title',
        'grid',
        'two_columns',
        'button',
        'card',
        'image',
        'from_library',
        'fragment',
        'video',
        'table',
        'on_this_page',
        'widget',
      ]),
      new FieldBlocks('header', 'Header', 1, ['hero']),
    ]
  }

  content(): FieldBlocks {
    return this.get('content')
  }

  header(): FieldBlocks {
    return this.get('header')
  }
}

export const getContentBundles = (): Array<typeof Content> => {
  return [ContentPage]
}
