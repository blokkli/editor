import { LOREM_SHORT } from '../../defaultText'
import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { FieldUrl } from '../Field/Url'
import { Block } from './Block'

export class BlockButton extends Block {
  static override bundle = 'button'
  static override label = 'Button'
  static override isTranslatable = true

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldText('title', 'Title'),
      new FieldUrl('url', 'URL'),
    ]
  }

  static override getDefaultValues(): Record<string, any> {
    return {
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
}
