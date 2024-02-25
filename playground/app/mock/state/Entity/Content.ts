import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldBlocks } from '../Field/Blocks'
import { FieldText } from '../Field/Text'

export abstract class Content extends Entity {
  static entityType = 'content'

  static getFieldDefintions(): Field<any>[] {
    return [...super.getFieldDefintions(), new FieldText('title', 'Title')]
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
        'blokkli_fragment',
        'video',
        'table',
        'on_this_page',
        'widget',
      ]),
      new FieldBlocks('buttons', 'Buttons', 3, ['button']),
      new FieldText('lead', 'Lead'),
    ]
  }

  content(): FieldBlocks {
    return this.get('content')
  }

  buttons(): FieldBlocks {
    return this.get('buttons')
  }

  lead(): FieldText {
    return this.get('lead')
  }

  getData() {
    return {
      title: this.title().getText(),
      lead: this.lead().getText(),
    }
  }
}

export const getContentBundles = (): Array<typeof Content> => {
  return [ContentPage]
}
