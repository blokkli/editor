import { Field } from '../Field'

export class FieldIcon extends Field<string> {
  constructor(id: string, label: string, cardinality = 1) {
    super('icon', id, label, cardinality)
  }

  getIconName(): string {
    return this.list[0] || ''
  }

  setIconName(name: string) {
    if (!this.list.length) {
      this.append(name)
      return
    }
    this.list[0] = name
  }

  toString() {
    return this.getIconName()
  }
}
