import type { MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'

export type MutationUpdateFieldValueArgs = {
  uuid: string
  fieldName: string
  fieldValue: string
}

export class MutationUpdateFieldValue extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('update_field_value', configuration)
  }

  override getAffectedUuid(
    args: MutationUpdateFieldValueArgs,
  ): string | undefined {
    return args.uuid
  }

  override execute(
    context: MutationContext,
    args: MutationUpdateFieldValueArgs,
  ) {
    const proxy = context.getProxy(args.uuid)
    if (!proxy) {
      return
    }
    const block = proxy.block
    // `fieldName` is a property path: `field` or `field.property`. Writing a
    // nested property must leave the field's other properties alone — replacing
    // the whole value would drop a link's uri when only its title changed.
    const resolved = block.resolveTextPath(args.fieldName)
    if (!resolved) {
      return
    }
    const { field, property } = resolved
    const value = JSON.parse(JSON.stringify(args.fieldValue))
    if (property === null) {
      field.setList([value])
    } else {
      field.setTextValue(property, value)
    }

    // Only mark translations as outdated when a translatable field changes.
    if (field.isTranslatable) {
      const languages = block.getTranslationLanguages()
      if (languages.length) {
        block.setValues({
          outdatedTranslations: JSON.stringify(languages),
        })
      }
    }
  }
}
