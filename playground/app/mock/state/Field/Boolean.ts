import { Field } from '../Field'

export class FieldBoolean extends Field<boolean> {
  constructor(id: string, label: string) {
    super('boolean', id, label, 1)
  }

  toString() {
    return this.list[0] === true ? 'Yes' : 'No'
  }
}
