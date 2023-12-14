import { Field } from './Field'
import { FieldBlocks } from './Field/Blocks'

export class Entity {
  static entityType = ''
  static bundle = ''
  static label = ''

  uuid: string
  fields: Record<string, Field<any>> = {}

  constructor(uuid: string) {
    this.uuid = uuid

    const constructor = this.constructor as typeof Entity
    constructor.getFieldDefintions().forEach((field) => {
      field.setEntity(this)
      this.fields[field.id] = field
    })
  }

  static getFieldDefintions(): Field<any>[] {
    return []
  }

  get entityType() {
    const constructor = this.constructor as typeof Entity
    return constructor.entityType
  }

  get bundle() {
    const constructor = this.constructor as typeof Entity
    return constructor.bundle
  }

  get label() {
    const constructor = this.constructor as typeof Entity
    return constructor.label
  }

  getBlockFields(): FieldBlocks[] {
    return Object.values(this.fields).filter(
      (v) => v.type === 'blocks',
    ) as FieldBlocks[]
  }

  addField(field: Field<any>) {
    this.fields[field.id] = field
  }

  get<T extends Field<any>>(id: string): T {
    return this.fields[id] as T
  }

  getValues(): Record<string, any> {
    return Object.values(this.fields).reduce<Record<string, any>>(
      (acc, field) => {
        acc[field.id] = [...field.list].map((item) => {
          return JSON.parse(JSON.stringify(item))
        })
        return acc
      },
      {},
    )
  }

  setValues(values: Record<string, any>) {
    Object.entries(values).forEach(([field, value]) => {
      this.fields[field].list = (Array.isArray(value) ? value : [value]).filter(
        Boolean,
      )
    })
  }

  toJSON() {
    return {
      entityType: this.entityType,
      bundle: this.bundle,
      uuid: this.uuid,
      values: this.fields,
    }
  }
}
