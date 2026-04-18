import type { MutationContext } from '#mock/state/EditState'
import { FieldReference } from '~/mock/state/Field/Reference'
import { Mutation } from '../Mutation'

export type MutationDroppableFieldUpdateArgs = {
  blockUuid: string
  fieldName: string
  items: Array<
    { type: 'existing'; uuid: string } | { type: 'new'; mediaId: string }
  >
}

export class MutationDroppableFieldUpdate extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('droppable_field_update', configuration)
  }

  override getAffectedUuid(
    args: MutationDroppableFieldUpdateArgs,
  ): string | undefined {
    return args.blockUuid
  }

  override execute(
    context: MutationContext,
    args: MutationDroppableFieldUpdateArgs,
  ) {
    const field =
      args.blockUuid === context.entity.uuid
        ? context.entity.get(args.fieldName)
        : context.getProxy(args.blockUuid)?.block.get(args.fieldName)
    if (!field || !(field instanceof FieldReference)) {
      return
    }

    const newList = args.items.map((item) =>
      item.type === 'existing' ? item.uuid : item.mediaId,
    )
    field.setList(newList)
  }
}
