import type { Entity } from './Entity'

export abstract class Field<T> {
  type: string
  id: string
  label: string
  cardinality: number
  list: T[]
  _entity: Entity | null = null

  constructor(type: string, id: string, label: string, cardinality: number) {
    this.type = type
    this.id = id
    this.label = label
    this.cardinality = cardinality
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
}
