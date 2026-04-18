import type { MutationContext } from '#mock/state/EditState'
import { FieldReference } from '~/mock/state/Field/Reference'
import { Mutation } from '../Mutation'

export type MutationDroppableFieldUpdateArgs = {
  ownerUuid: string
  fieldName: string
  itemIds: string[]
}

export class MutationDroppableFieldUpdate extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('droppable_field_update', configuration)
  }

  override getAffectedUuid(
    args: MutationDroppableFieldUpdateArgs,
  ): string | undefined {
    return args.ownerUuid
  }

  override execute(
    context: MutationContext,
    args: MutationDroppableFieldUpdateArgs,
  ) {
    const field =
      args.ownerUuid === context.entity.uuid
        ? context.entity.get(args.fieldName)
        : context.getProxy(args.ownerUuid)?.block.get(args.fieldName)
    if (!field || !(field instanceof FieldReference)) {
      return
    }

    field.setList(args.itemIds)
  }
}
