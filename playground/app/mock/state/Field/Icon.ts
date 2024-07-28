import { Field } from '../Field'

export class FieldIcon extends Field<string> {
  constructor(id: string, label: string, cardinality = 1, required = false) {
    super('icon', id, label, cardinality, required)
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

  override toString() {
    return this.getIconName()
  }
}
