import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { FieldUrl } from '../Field/Url'

export abstract class Media extends Entity {
  static entityType = 'media'

  thumbnail(): string | undefined {
    return
  }

  title(): string {
    return ''
  }
}

export class MediaImage extends Media {
  static bundle = 'image'
  static label = 'Image'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldUrl('url', 'URL'),
      new FieldText('alt', 'Alt Text'),
      new FieldText('filename', 'File name'),
    ]
  }

  url() {
    return this.fields.url.list[0] || ''
  }

  thumbnail(): string | undefined {
    return this.url()
  }

  alt(): string {
    return this.get<FieldText>('alt').getText()
  }

  filename(): string {
    return this.get<FieldText>('filename').getText()
  }

  title(): string {
    return this.alt()
  }

  getData() {
    return {
      url: this.url(),
      alt: this.alt(),
      filename: this.filename(),
    }
  }
}

export class MediaVideo extends Media {
  static bundle = 'video'
  static label = 'Video'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldUrl('url', 'URL'),
      new FieldText('title', 'Title'),
    ]
  }

  url() {
    return this.fields.url.list[0] || ''
  }

  title(): string {
    return this.get<FieldText>('title').getText()
  }

  getYouTubeID(): string | null {
    const url = this.url()
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[7].length === 11 ? match[7] : null
  }

  thumbnail() {
    return `https://i3.ytimg.com/vi/${this.getYouTubeID()}/maxresdefault.jpg`
  }
}
