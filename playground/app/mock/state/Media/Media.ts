import { Entity } from '../Entity'
import type { Field } from '../Field'
import { FieldText } from '../Field/Text'
import { FieldUrl } from '../Field/Url'

export abstract class Media extends Entity {
  static override entityType = 'media'

  thumbnail(): string | undefined {
    return
  }

  title(): string {
    return ''
  }
}

export class MediaImage extends Media {
  static override bundle = 'image'
  static override label = 'Image'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldUrl('url', 'URL'),
      new FieldText('alt', 'Alt Text'),
      new FieldText('filename', 'File name'),
      new FieldText('width', 'Width'),
      new FieldText('height', 'Height'),
    ]
  }

  url() {
    return this.fields.url.list[0] || ''
  }

  override thumbnail(): string | undefined {
    return this.url()
  }

  alt(): string {
    return this.get<FieldText>('alt').getText()
  }

  filename(): string {
    return this.get<FieldText>('filename').getText()
  }

  width(): string {
    return this.get<FieldText>('width').getText()
  }

  height(): string {
    return this.get<FieldText>('height').getText()
  }

  override title(): string {
    return this.alt()
  }

  override getData() {
    return {
      url: this.url(),
      alt: this.alt(),
      filename: this.filename(),
      width: this.width(),
      height: this.height(),
    }
  }
}

export class MediaVideo extends Media {
  static override bundle = 'video'
  static override label = 'Video'

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldUrl('url', 'URL'),
      new FieldText('title', 'Title'),
    ]
  }

  url() {
    return this.fields.url.list[0] || ''
  }

  override title(): string {
    return this.get<FieldText>('title').getText()
  }

  getYouTubeID(): string | null {
    const url = this.url()
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[7].length === 11 ? match[7] : null
  }

  override thumbnail() {
    return `https://i3.ytimg.com/vi/${this.getYouTubeID()}/maxresdefault.jpg`
  }
}
