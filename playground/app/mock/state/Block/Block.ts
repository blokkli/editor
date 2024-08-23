import type { Field } from '../Field'
import { FieldOptions } from '../Field/Options'
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
}
