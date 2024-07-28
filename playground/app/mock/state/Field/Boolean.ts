import { Field } from '../Field'

export class FieldBoolean extends Field<boolean> {
  constructor(id: string, label: string, required = false) {
    super('boolean', id, label, 1, required)
  }

  override toString() {
    return this.list[0] === true ? 'Yes' : 'No'
  }
}
