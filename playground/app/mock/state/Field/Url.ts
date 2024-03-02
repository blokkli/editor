import { Field } from '../Field'

export class FieldUrl extends Field<string> {
  constructor(id: string, label: string, cardinality = 1, required = false) {
    super('url', id, label, cardinality, required)
  }

  toString(): string {
    return this.list[0] || ''
  }
}
