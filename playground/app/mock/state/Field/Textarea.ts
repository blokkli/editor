import { Field } from '../Field'

export class FieldTextarea extends Field<string> {
  maxLength: number

  constructor(
    id: string,
    label: string,
    cardinality = 1,
    required = false,
    maxLength = -1,
  ) {
    super('textarea', id, label, cardinality, required)
    this.maxLength = maxLength
  }

  getText(): string {
    return this.list[0] || ''
  }

  setText(text: string) {
    if (!this.list.length) {
      this.append(text)
      return
    }
    this.list[0] = text
  }

  override toString() {
    return this.getText()
  }
}
