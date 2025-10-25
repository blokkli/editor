import type { BlockEditContext } from '#blokkli/types'
import type { Field } from '../Field'
import { FieldOptions } from '../Field/Options'
import { FieldText } from '../Field/Text'
import type { EntityValidation } from '../Validation'
import { Entity } from './../Entity'

export abstract class Block extends Entity {
  public static override entityType = 'block'
  static allowReusable = false
  static isTranslatable = false

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldOptions('options', 'Options'),
      new FieldText('publishOn', 'Publish On'),
      new FieldText('unpublishOn', 'Unpublish On'),
    ]
  }

  static getDefaultValues(): Record<string, any> {
    return {}
  }

  options(): FieldOptions {
    return this.fields.options as FieldOptions
  }

  getProps(): Record<string, any> {
    const translation = this.getTranslation(this.langcode)
    const props: Record<string, any> = {}
    Object.values(translation.fields).forEach((field) => {
      props[field.id] = field.getPropValue()
    })
    return props
  }

  validate(): EntityValidation[] {
    return []
  }

  getEditContext(): BlockEditContext {
    const publishOn = this.get('publishOn').getPropValue()
    const unpublishOn = this.get('unpublishOn').getPropValue()

    // Calculate isPublished based on publishOn date
    let isPublished = true
    if (publishOn) {
      const publishDate = new Date(publishOn)
      const now = new Date()
      // If publishOn is in the future, the block is not published yet
      if (publishDate > now) {
        isPublished = false
      }
    }
    return {
      isPublished,
      publishOn,
      unpublishOn,
    }
  }
}
