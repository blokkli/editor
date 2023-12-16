import type { Field } from '../Field'
import { FieldOptions } from '../Field/Options'
import { Entity } from './../Entity'

export abstract class Block extends Entity {
  public static entityType = 'block'
  static allowReusable = false

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
    const props: Record<string, any> = {}
    Object.values(this.fields).forEach((field) => {
      props[field.id] = field.getPropValue()
    })
    return props
  }
}
