import { Field } from '../Field'

export class FieldTimestamp extends Field<number> {
  constructor(id: string, label: string, cardinality = 1) {
    super('timestamp', id, label, cardinality)
  }

  getTimestamp(): number {
    return this.list[0] || 0
  }
}
