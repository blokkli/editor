import type { Field } from '../Field'
import { FieldOptions } from '../Field/Options'
import { Entity } from './../Entity'

export abstract class Block extends Entity {
  public static entityType = 'block'
  static allowReusable = false
  static isTranslatable = false

  static getFieldDefintions(): Field<any>[] {
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
    if (this.uuid === '49e2da9e-4e87-4570-9909-458494c9cf3d') {
    }
    const props: Record<string, any> = {}
    Object.values(translation.fields).forEach((field) => {
      props[field.id] = field.getPropValue()
    })
    return props
  }
}
