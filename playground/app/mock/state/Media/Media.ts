import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { FieldUrl } from '../Field/Url'

export class Media extends Entity {
  static entityType = 'media'
}

export class MediaImage extends Media {
  static bundle = 'image'
  static label = 'Image'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldUrl('url', 'URL'),
      new FieldText('alt', 'Alt Text'),
    ]
  }

  url() {
    return this.fields.url.list[0] || ''
  }
}
