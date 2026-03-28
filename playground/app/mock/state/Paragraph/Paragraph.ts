import type { BlockEditContext } from '#blokkli/types/field'
import type { Field } from '../Field'
import { FieldBoolean } from '../Field/Boolean'
import { FieldOptions } from '../Field/Options'
import { FieldText } from '../Field/Text'
import type { EntityValidation } from '../Validation'
import { Entity } from '../Entity'

export abstract class Paragraph extends Entity {
  public static override entityType = 'paragraph'
  static allowReusable = false
  static isTranslatable = false

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBoolean('isNew', 'is new'),
      new FieldOptions('options', 'Options'),
      new FieldText('publishOn', 'Publish On'),
      new FieldText('unpublishOn', 'Unpublish On'),
      new FieldText('outdatedTranslations', 'Outdated Translations'),
    ]
  }

  static getDefaultValues(): Record<string, any> {
    return {
      isNew: true,
      outdatedTranslations: JSON.stringify(['de', 'fr']),
    }
  }

  options(): FieldOptions {
    return this.fields.options as FieldOptions
  }

  getProps(): Record<string, any> {
    const translation = this.getTranslation(this.langcode)
    const props: Record<string, any> = {}
    Object.values(translation.fields).forEach((field) => {
      if (field.id !== 'publishOn' && field.id !== 'unpublishOn') {
        props[field.id] = field.getPropValue()
      }
    })
    return props
  }

  validate(): EntityValidation[] {
    return []
  }

  getEditContext(): BlockEditContext {
    const publishOn = this.get('publishOn').getPropValue()
    const unpublishOn = this.get('unpublishOn').getPropValue()
    const isNew = !!this.get('isNew').getPropValue()

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
    const rawOutdated = this.get('outdatedTranslations').getPropValue()
    let outdatedTranslations: string[] = []
    if (
      rawOutdated === null ||
      rawOutdated === undefined ||
      rawOutdated === ''
    ) {
      // Field was never explicitly set: default to all translation languages
      // being outdated. This simulates the Drupal server-side tracking.
      outdatedTranslations = ['de', 'fr', 'it']
    } else {
      try {
        outdatedTranslations = JSON.parse(rawOutdated)
      } catch {
        /* ignore invalid JSON */
      }
    }

    return {
      isPublished,
      isNew,
      publishOn,
      unpublishOn,
      outdatedTranslations,
    }
  }
}
