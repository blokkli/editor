import { type MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'
import { FieldReference } from '~/app/mock/state/Field/Reference'

export type MutationReplaceEntityMediaArgs = {
  fieldName: string
  mediaUuid: string
}

export class MutationReplaceEntityMedia extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('replace_entity_media', configuration)
  }

  execute(context: MutationContext, args: MutationReplaceEntityMediaArgs) {
    const field = context.entity.get(args.fieldName)
    if (!(field instanceof FieldReference)) {
      return
    }

    field.setList([JSON.parse(JSON.stringify(args.mediaUuid))])
  }
}
