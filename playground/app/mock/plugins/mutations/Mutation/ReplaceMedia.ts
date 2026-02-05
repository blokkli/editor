import type { MutationContext } from '#mock/state/EditState'
import { entityStorageManager } from '#mock/entityStorage'
import { FieldReference } from '~/mock/state/Field/Reference'
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

  override getAffectedUuid(args: MutationReplaceMediaArgs): string | undefined {
    return args.blockUuid
  }

  override execute(context: MutationContext, args: MutationReplaceMediaArgs) {
    const proxy = context.getProxy(args.blockUuid)
    if (!proxy) {
      return
    }
    const block = proxy.block
    const field = block.get(args.fieldName)
    if (!field) {
      return
    }
    if (field instanceof FieldReference) {
      field.setList([JSON.parse(JSON.stringify(args.mediaUuid))])
    } else {
      const media = entityStorageManager
        .getStorage('media')
        .load(args.mediaUuid)
      if (!media) {
        throw new Error('Invalid media.')
      }
      const thumbnail = media.thumbnail()
      field.setList([thumbnail])
    }
  }
}
