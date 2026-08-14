import type { MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationEditEntityArgs = {
  values: Record<string, any>
}

export class MutationEditEntity extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('edit_entity', configuration)
  }

  override execute(context: MutationContext, args: MutationEditEntityArgs) {
    context.entity.setValues(args.values)
  }
}
