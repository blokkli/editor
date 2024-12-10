import { BlockProxy, type MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '~/app/mock/entityStorage'
import { getBlockBundles } from '~/app/mock/state/Block'

export type MutationAddArgs = {
  bundle: string
  values?: Record<string, any>
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  preceedingUuid?: string
}

export class MutationAdd extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('add', configuration)
  }

  override execute(
    context: MutationContext,
    arg: MutationAddArgs[] | MutationAddArgs,
  ) {
    const items: MutationAddArgs[] = Array.isArray(arg) ? arg : [arg]
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const uuid = this.getUuidForNewEntity(i.toString())

      const block = entityStorageManager.createBlock(item.bundle, uuid)
      if (item.values) {
        block.setValues(item.values)
      } else {
        const blockBundle = getBlockBundles().find(
          (v) => v.bundle === item.bundle,
        )!
        const defaultValues = blockBundle.getDefaultValues()
        block.setValues(defaultValues)
      }

      const proxy = new BlockProxy(
        block,
        item.hostEntityType,
        item.hostEntityUuid,
        item.hostField,
      )

      context.addProxy(proxy, item.preceedingUuid)
    }
  }
}
