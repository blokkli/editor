import type { Field } from '../Field'
import { FieldOptions } from '../Field/Options'
import { Entity } from './../Entity'

export abstract class Block extends Entity {
  public static entityType = 'block'

  static getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldOptions('options', 'Options'),
    ]
  }

  options(): FieldOptions {
    return this.fields.options as FieldOptions
  }
}
