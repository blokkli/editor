import type { Field } from './Field'
import type { FieldBlocks } from './Field/Blocks'
import { FieldText } from './Field/Text'
import { FieldTextarea } from './Field/Textarea'

export class Entity {
  static entityType = ''
  static bundle = ''
  static label = ''
  static description = ''
  static imageUrl = ''
  langcode = 'en'

  uuid: string
  fields: Record<string, Field<any>> = {}
  translationValues: Record<string, Record<string, string[]>> = {}
  private _sourceValues: Record<string, any[]> | null = null

  constructor(uuid: string) {
    this.uuid = uuid

    const constructor = this.constructor as typeof Entity
    constructor.getFieldDefintions().forEach((field) => {
      field.setEntity(this)
      this.fields[field.id] = field
    })
  }

  addTranslation(language: string, values: Record<string, string[]>) {
    const filtered: Record<string, string[]> = {}
    for (const [fieldName, value] of Object.entries(values)) {
      const field = this.fields[fieldName]
      if (field?.isTranslatable) {
        filtered[fieldName] = value
      }
    }
    if (!this.translationValues[language]) {
      this.translationValues[language] = {}
    }
    Object.assign(this.translationValues[language], filtered)
  }

  getTranslation(language: string) {
    // Restore source values before applying any translation so that
    // switching languages doesn't corrupt the entity.
    if (this._sourceValues) {
      for (const [fieldName, values] of Object.entries(this._sourceValues)) {
        const field = this.fields[fieldName]
        if (field) {
          field.setList(values)
        }
      }
      this._sourceValues = null
    }

    if (language === 'en') {
      this.langcode = 'en'
      return this
    }

    this.langcode = language

    if (this.translationValues[language]) {
      // Save source values for translatable fields before overwriting.
      const source: Record<string, any[]> = {}
      for (const [fieldName] of Object.entries(
        this.translationValues[language],
      )) {
        const field = this.fields[fieldName]
        if (field?.isTranslatable) {
          source[fieldName] = [...field.list]
        }
      }
      this._sourceValues = source

      for (const [fieldName, values] of Object.entries(
        this.translationValues[language],
      )) {
        const field = this.fields[fieldName]
        if (field?.isTranslatable) {
          field.setList(values)
        }
      }
    }

    return this
  }

  setTranslationValues(
    langcode: string,
    valuesInput: Record<string, any[] | any>,
  ) {
    if (!this.translationValues[langcode]) {
      this.translationValues[langcode] = {}
    }
    Object.entries(valuesInput).forEach(([fieldName, value]) => {
      const field = this.fields[fieldName]
      if (field?.isTranslatable) {
        this.translationValues[langcode]![fieldName] = Array.isArray(value)
          ? value
          : [value]
      }
    })
  }

  getTranslationLanguages(): string[] {
    return Object.keys(this.translationValues)
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

  getTextFields(): Array<FieldText | FieldTextarea> {
    return Object.values(this.fields).filter((field) => {
      return field instanceof FieldText || field instanceof FieldTextarea
    })
  }

  getTranslatableFields(): Field<any>[] {
    return Object.values(this.fields).filter((field) => field.isTranslatable)
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
      this.fields[field]!.list = (
        Array.isArray(value) ? value : [value]
      ).filter(Boolean)
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

  getData() {
    return {}
  }
}
