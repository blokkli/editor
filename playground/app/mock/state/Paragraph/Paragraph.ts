import type { BlockEditContext } from '#blokkli/types/field'
import type { Field } from '../Field'
import { FieldBoolean } from '../Field/Boolean'
import { FieldOptions } from '../Field/Options'
import { FieldText } from '../Field/Text'
import type { EntityValidation, MutatedChildren } from '../Validation'
import { Entity } from '../Entity'
import { readOutdatedTranslationsOverride } from '../../outdatedTranslationsOverride'

export abstract class Paragraph extends Entity {
  public static override entityType = 'paragraph'
  static allowReusable = false
  static isTranslatable = false

  static override getFieldDefintions(): Field<any>[] {
    return [
      ...super.getFieldDefintions(),
      new FieldBoolean('isNew', 'is new'),
      new FieldOptions('options', 'Options'),
      new FieldText('publishOn', 'Publish On', 1, false, -1, false),
      new FieldText('unpublishOn', 'Unpublish On', 1, false, -1, false),
      new FieldText(
        'outdatedTranslations',
        'Outdated Translations',
        1,
        false,
        -1,
        false,
      ),
    ]
  }

  static getDefaultValues(): Record<string, any> {
    return {
      isNew: true,
    }
  }

  options(): FieldOptions {
    return this.fields.options as FieldOptions
  }

  getProps(): Record<string, any> {
    const translation = this.getTranslation(this.langcode)
    const props: Record<string, any> = {}
    Object.values(translation.fields).forEach((field) => {
      if (field.id !== 'publishOn' && field.id !== 'unpublishOn') {
        props[field.id] = field.getPropValue()
      }
    })
    return props
  }

  /**
   * Validate the block against the state the current mutation would save.
   *
   * Scalar fields can be read off the block itself (the proxy clone carries the
   * mutated values), but structural rules must use `children` — see
   * {@link MutatedChildren}.
   */
  validate(_children: MutatedChildren): EntityValidation[] {
    return []
  }

  getEditContext(): BlockEditContext {
    const publishOn = this.get('publishOn').getPropValue()
    const unpublishOn = this.get('unpublishOn').getPropValue()
    const isNew = !!this.get('isNew').getPropValue()

    // Calculate isPublished based on publishOn date
    let isPublished = true
    if (publishOn) {
      const publishDate = new Date(publishOn)
      const now = new Date()
      // If publishOn is in the future, the block is not published yet
      if (publishDate > now) {
        isPublished = false
      }
    }
    const rawOutdated = this.get('outdatedTranslations').getPropValue()
    let outdatedTranslations: string[] = []
    if (
      rawOutdated === null ||
      rawOutdated === undefined ||
      rawOutdated === ''
    ) {
      // Field was never explicitly set: default to all languages that have
      // translations on this entity.
      outdatedTranslations = this.getTranslationLanguages()

      // E2E test seam: when no explicit outdated value has been written, merge
      // in any seeded outdated languages for this uuid. This lets a spec reach
      // the outdated state without driving the full add → translate → re-edit
      // UI loop. The override is scoped to the "unset" branch on purpose: once
      // `mark_translation_up_to_date` writes an explicit value, that wins —
      // otherwise clearing outdated would never stick. See
      // outdatedTranslationsOverride.ts.
      const override = readOutdatedTranslationsOverride()
      const seeded = override?.[this.uuid]
      if (seeded?.length) {
        const merged = new Set(outdatedTranslations)
        for (const lang of seeded) merged.add(lang)
        outdatedTranslations = [...merged]
      }
    } else {
      try {
        outdatedTranslations = JSON.parse(rawOutdated)
      } catch {
        /* ignore invalid JSON */
      }
    }

    return {
      isPublished,
      isNew,
      publishOn,
      unpublishOn,
      outdatedTranslations,
    }
  }
}
