import type { Block } from './Block'
import type { Entity } from './Entity'

export abstract class Field<T> {
  type: string
  id: string
  label: string
  cardinality: number
  list: T[]
  entity: Entity

  constructor(
    type: string,
    id: string,
    label: string,
    cardinality: number,
    entity: Entity,
  ) {
    this.type = type
    this.id = id
    this.label = label
    this.cardinality = cardinality
    this.list = []
    this.entity = entity
  }

  append(v: T) {
    this.list.push(v)
  }

  getFieldListKey() {
    return [this.entity.entityType, this.entity.uuid, this.id].join(':')
  }
}

export class FieldText extends Field<string> {
  constructor(id: string, label: string, entity: Entity) {
    super('text', id, label, 1, entity)
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

export type FieldOptionsItem = {
  key: string
  value: string
}

export class FieldOptions extends Field<FieldOptionsItem> {
  constructor(id: string, label: string, entity: Entity) {
    super('options', id, label, -1, entity)
  }

  getOptions() {
    const options = this.list.reduce<Record<string, string>>((acc, v) => {
      acc[v.key] = v.value
      return acc
    }, {})

    return {
      mock: options,
    }
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

export class FieldBlocks extends Field<Block> {
  allowedBundles: string[]

  constructor(
    id: string,
    label: string,
    cardinality: number,
    allowedBundles: string[],
    entity: Entity,
  ) {
    super('blocks', id, label, cardinality, entity)
    this.allowedBundles = allowedBundles
  }

  getBlocks(): Block[] {
    return this.list
  }

  setBlocks(blocks: Block[]) {
    this.list = blocks
  }
}
