import { type MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'

export type MutationReplaceMediaArgs = {
  blockUuid: string
  fieldName: string
  mediaUuid: string
}

export class MutationReplaceMedia extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('replace_media', configuration)
  }

  getAffectedUuid(args: MutationReplaceMediaArgs): string | undefined {
    return args.blockUuid
  }

  execute(context: MutationContext, args: MutationReplaceMediaArgs) {
    const proxy = context.getProxy(args.blockUuid)
    if (!proxy) {
      return
    }
    const block = proxy.block
    const field = block.get(args.fieldName)
    if (!field) {
      return
    }
    field.setList([JSON.parse(JSON.stringify(args.mediaUuid))])
  }
}
