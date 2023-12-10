import { Field, FieldBlocks, FieldText } from './Field'

export class Entity {
  uuid: string
  entityType: string
  bundle: string
  fields: Record<string, Field<any>> = {}

  constructor(uuid: string, entityType: string, bundle: string) {
    this.uuid = uuid
    this.entityType = entityType
    this.bundle = bundle
  }

  // Clone method for Entity
  clone(newUuid: string): Entity {
    // Create a new instance of the current class
    const cloned = new (this.constructor as typeof Entity)(
      newUuid,
      this.entityType,
      this.bundle,
    )

    const values = this.getValues()
    cloned.setValues(values)

    return cloned
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
        acc[field.id] = field.list
        return acc
      },
      {},
    )
  }

  setValues(values: Record<string, any>) {
    Object.entries(values).forEach(([field, value]) => {
      this.fields[field].list = value
    })
  }
}

export class ContentPage extends Entity {
  constructor(uuid: string) {
    super(uuid, 'content', 'page')
    this.addField(new FieldText('title', 'Titel', this))
    this.addField(
      new FieldBlocks(
        'content',
        'Content',
        -1,
        ['text', 'title', 'grid'],
        this,
      ),
    )
    this.addField(new FieldBlocks('footer', 'Footer', -1, ['text'], this))
  }

  title(): FieldText {
    return this.get('title')
  }

  content(): FieldBlocks {
    return this.get('content')
  }

  footer(): FieldBlocks {
    return this.get('footer')
  }
}
