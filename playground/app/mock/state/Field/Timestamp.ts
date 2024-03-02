import { Field } from '../Field'

export class FieldTimestamp extends Field<number> {
  constructor(id: string, label: string, cardinality = 1, required = false) {
    super('timestamp', id, label, cardinality, required)
  }

  getTimestamp(): number {
    return this.list[0] || 0
  }
}
