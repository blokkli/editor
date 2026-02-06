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
    }

    for (const item of args.entityItems) {
      const field = context.entity.get(item.fieldName)
      if (field instanceof FieldText) {
        field.setList([JSON.parse(JSON.stringify(item.fieldValue))])
      }
    }
  }
}
