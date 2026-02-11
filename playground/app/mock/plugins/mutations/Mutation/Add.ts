import { BlockProxy, type MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '#mock/entityStorage'
import { getParagraphBundles } from '#mock/state/Paragraph'

export type MutationAddArgs = {
  bundle: string
  values?: Record<string, any>
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  preceedingUuid: string | null
  /** Optional UUID to use for the new block. If provided, this UUID is used instead of generating one. */
  blockUuid?: string
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
      const item = items[i]!
      // Use provided blockUuid if available, otherwise generate one
      const uuid = item.blockUuid ?? this.getUuidForNewEntity(i.toString())

      const block = entityStorageManager.createBlock(item.bundle, uuid)
      const blockBundle = getParagraphBundles().find(
        (v) => v.bundle === item.bundle,
      )!
      const defaultValues = blockBundle.getDefaultValues()
      if (item.values) {
        block.setValues({ ...defaultValues, ...item.values })
      } else {
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
