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
    required: boolean,
    entityType: ValidStorageKey,
    allowedBundles: string[],
  ) {
    super('reference', id, label, cardinality, required)
    this.targetEntityType = entityType
    this.allowedBundles = allowedBundles
  }

  override getPropValueItem(uuid: string) {
    return entityStorageManager.load(this.targetEntityType, uuid)
  }

  getReferencedEntities(): T[] {
    return this.list
      .map(
        (uuid) =>
          entityStorageManager.load(this.targetEntityType, uuid) as unknown,
      )
      .filter(falsy) as T[]
  }
}
