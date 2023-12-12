import { falsy } from '#blokkli/helpers'
import { entityStorageManager, type ValidStorageKey } from '../../entityStorage'
import type { Entity } from '../Entity'
import { Field } from '../Field'

export class FieldReference<T extends Entity> extends Field<string> {
  targetEntityType: ValidStorageKey
  allowedBundles: string[]

  constructor(
    id: string,
    label: string,
    cardinality: number,
    entityType: ValidStorageKey,
    allowedBundles: string[],
  ) {
    super('reference', id, label, cardinality)
    this.targetEntityType = entityType
    this.allowedBundles = allowedBundles
  }

  getReferencedEntities(): T[] {
    return this.list
      .map((uuid) => {
        return entityStorageManager.load(this.targetEntityType, uuid)
      })
      .filter(falsy) as T[]
  }
}
