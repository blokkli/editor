import { Field } from '../Field'

export type FieldOptionsItem = {
  key: string
  value: string
}

export class FieldOptions extends Field<FieldOptionsItem> {
  constructor(id: string, label: string) {
    super('options', id, label, -1)
  }

  getOptions() {
    return this.list.reduce<Record<string, string>>((acc, v) => {
      acc[v.key] = v.value
      return acc
    }, {})
  }

  getOption(key: string): FieldOptionsItem | undefined {
    return this.list.find((v) => v.key === key)
  }

  setOptionValue(key: string, value: string) {
    const existing = this.list.find((v) => v.key === key)
    if (existing === undefined) {
      return this.append({ key, value })
    }
    existing.value = value
  }
}
