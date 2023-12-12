import { Field } from '../Field'

export class FieldText extends Field<string> {
  constructor(id: string, label: string, cardinality = 1) {
    super('text', id, label, cardinality)
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

  toString() {
    return this.getText()
  }
}
