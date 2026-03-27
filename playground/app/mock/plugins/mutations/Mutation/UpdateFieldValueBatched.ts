import type { MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'
import { FieldText } from '#mock/state/Field/Text'

export type MutationUpdateFieldValueBatchedArgs = {
  items: Array<{ uuid: string; fieldName: string; fieldValue: string }>
  entityItems: Array<{ fieldName: string; fieldValue: string }>
}

export class MutationUpdateFieldValueBatched extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('update_field_value_batched', configuration)
  }

  override execute(
    context: MutationContext,
    args: MutationUpdateFieldValueBatchedArgs,
  ) {
    const modifiedUuids = new Set<string>()
    for (const item of args.items) {
      const proxy = context.getProxy(item.uuid)
      if (!proxy) {
        continue
      }
      const field = proxy.block.get(item.fieldName)
      if (!field) {
        continue
      }
      field.setList([JSON.parse(JSON.stringify(item.fieldValue))])
      modifiedUuids.add(item.uuid)
    }

    // Editing source blocks marks all translations as outdated.
    for (const uuid of modifiedUuids) {
      const proxy = context.getProxy(uuid)
      if (proxy) {
        proxy.block.setValues({
          outdatedTranslations: JSON.stringify(['de', 'fr', 'it']),
        })
      }
    }

    for (const item of args.entityItems) {
      const field = context.entity.get(item.fieldName)
      if (field instanceof FieldText) {
        field.setList([JSON.parse(JSON.stringify(item.fieldValue))])
      }
    }
  }
}
