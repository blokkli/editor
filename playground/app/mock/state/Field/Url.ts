import { Field } from '../Field'

export class FieldUrl extends Field<string> {
  constructor(id: string, label: string) {
    super('url', id, label, 1)
  }

  toString(): string {
    return this.list[0] || ''
  }
}
