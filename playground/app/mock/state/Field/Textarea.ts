import { Field } from '../Field'

export class FieldTextarea extends Field<string> {
  constructor(id: string, label: string) {
    super('textarea', id, label, 1)
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
