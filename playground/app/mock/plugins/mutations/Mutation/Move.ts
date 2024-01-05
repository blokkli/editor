import type { MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'
import { falsy } from '#blokkli/helpers'

export type MutationMoveArgs = {
  uuids: string[]
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  preceedingUuid?: string
}

export class MutationMove extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('move', configuration)
  }

  getAffectedUuid(args: MutationMoveArgs): string | undefined {
    return args.uuids[0]
  }

  execute(context: MutationContext, args: MutationMoveArgs) {
    const proxies = args.uuids
      .map((uuid) => {
        const proxy = context.getProxy(uuid)
        const index = context.getIndex(uuid)
        if (index !== undefined && proxy) {
          return { proxy, index }
        }
      })
      .filter(falsy)
      .sort((a, b) => b.index - a.index)
      .map((v) => v.proxy)

    let after = args.preceedingUuid

    proxies.forEach((proxy) => {
      proxy.hostEntityType = args.hostEntityType
      proxy.hostEntityUuid = args.hostEntityUuid
      proxy.hostField = args.hostField
      context.moveProxyAfter(proxy.block.uuid, after)
      after = proxy.block.uuid
    })
  }
}
