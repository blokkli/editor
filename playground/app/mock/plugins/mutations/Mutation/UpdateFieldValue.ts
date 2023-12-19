import { type MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'

export type MutationUpdateFieldValueArgs = {
  uuid: string
  fieldName: string
  fieldValue: string
}

export class MutationUpdateFieldValue extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('add', configuration)
  }

  execute(context: MutationContext, args: MutationUpdateFieldValueArgs) {
    const proxy = context.getProxy(args.uuid)
    if (!proxy) {
      return
    }
    const block = proxy.block
    const field = block.get(args.fieldName)
    if (!field) {
      return
    }
    field.setList([JSON.parse(JSON.stringify(args.fieldValue))])
  }
}
