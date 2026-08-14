import type { Entity } from './Entity'

/**
 * One translatable text value, addressed by property path.
 *
 * A text field exposes its own value, so the path is just the field id. A field
 * whose value is a structure can expose text *properties* inside it, in which
 * case the path is `fieldId.property` — the convention Drupal uses, and the one
 * `paragraphs_blokkli` already writes through
 * (`UpdateFieldValueTrait::updateTextFieldValue`).
 */
export type FieldTextEntry = {
  path: string
  label: string
  value: string
  fieldType: 'plain' | 'markup'
  maxLength: number
  isTranslatable: boolean
}

/** Split `field.property` into its parts. A bare field id yields a null property. */
export function splitFieldPath(path: string): [string, string | null] {
  const index = path.indexOf('.')
  if (index === -1) {
    return [path, null]
  }
  return [path.slice(0, index), path.slice(index + 1)]
}

export abstract class Field<T> {
  type: string
  id: string
  label: string
  cardinality: number
  required: boolean
  isTranslatable: boolean
  list: T[]
  _entity: Entity | null = null

  constructor(
    type: string,
    id: string,
    label: string,
    cardinality: number,
    required = false,
    isTranslatable = false,
  ) {
    this.type = type
    this.id = id
    this.label = label
    this.cardinality = cardinality
    this.required = required
    this.isTranslatable = isTranslatable
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
      if (this.list.length) {
        return this.getPropValueItem(this.list[0]!)
      }
      return undefined
    }
    return this.list.map((v) => this.getPropValueItem(v))
  }

  getPropValueItem(v: T): any {
    return v
  }

  /**
   * The translatable text values this field exposes. Empty for fields that
   * carry no text (references, options, booleans...).
   */
  getTextEntries(): FieldTextEntry[] {
    return []
  }

  /**
   * Write one of the values from {@link getTextEntries}, addressed by the
   * property within this field. `null` means the field's own value.
   */
  setTextValue(property: string | null, value: string): void {
    if (property === null) {
      this.setList([value as unknown as T])
    }
  }

  toJSON() {
    return this.list
  }
}
