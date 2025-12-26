import { Mutation } from '../Mutation'
import type { MutationContext } from '#mock/state/EditState'
import type { BlokkliAdapterSetBlockScheduleOptions } from '#blokkli/editor/adapter'

export type MutationSetBlockScheduleArgs = {
  blocks: BlokkliAdapterSetBlockScheduleOptions[]
}

export class MutationSetBlockSchedule extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('set_block_schedule', configuration)
  }

  override execute(
    context: MutationContext,
    args: MutationSetBlockScheduleArgs,
  ) {
    args.blocks.forEach((item) => {
      const uuid = item.uuid
      const proxy = context.getProxy(uuid)
      if (!proxy) {
        return
      }

      if (item.type === 'publish') {
        proxy.block.setValues({
          publishOn: item.date,
        })
      } else if (item.type === 'unpublish') {
        proxy.block.setValues({
          unpublishOn: item.date,
        })
      }
    })
  }
}
