import { type MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'
import { FieldText } from '~/app/mock/state/Field/Text'

export type MutationUpdateEntityFieldValueArgs = {
  fieldName: string
  fieldValue: string
}

export class MutationUpdateEntityFieldValue extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('update_entity_field_value', configuration)
  }

  override execute(
    context: MutationContext,
    args: MutationUpdateEntityFieldValueArgs,
  ) {
    const field = context.entity.get(args.fieldName)
    if (field instanceof FieldText) {
      field.setList([JSON.parse(JSON.stringify(args.fieldValue))])
    }
  }
}
