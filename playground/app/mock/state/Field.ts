import type { Entity } from './Entity'

export abstract class Field<T> {
  type: string
  id: string
  label: string
  cardinality: number
  required: boolean
  list: T[]
  _entity: Entity | null = null

  constructor(
    type: string,
    id: string,
    label: string,
    cardinality: number,
    required = false,
  ) {
    this.type = type
    this.id = id
    this.label = label
    this.cardinality = cardinality
    this.required = required
    this.list = []
  }

  setEntity(entity: Entity) {
    this._entity = entity
  }

  get entity(): Entity {
    return this._entity as Entity
  }

  append(v: T) {
    this.list.push(v)
  }

  setList(v: T[] = []) {
    this.list = [...v]
  }

  getFieldListKey() {
    return [this.entity.entityType, this.entity.uuid, this.id].join(':')
  }

  toString() {
    return JSON.stringify(this.list)
  }

  getPropValue(): any {
    if (this.cardinality === 1) {
      return this.getPropValueItem(this.list[0])
    }
    return this.list.map((v) => this.getPropValueItem(v))
  }

  getPropValueItem(v: T): any {
    return v
  }

  toJSON() {
    return this.list
  }
}
