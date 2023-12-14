import { BlockProxy, type MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '~/app/mock/entityStorage'
import { LibraryItem } from '~/app/mock/state/LibraryItem'

export type MutationMakeReusableArgs = {
  uuid: string
  label: string
}

export class MutationMakeReusable extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('make_reusable', configuration)
  }

  execute(context: MutationContext, args: MutationMakeReusableArgs) {
    let libraryItemId = this.configuration['libraryItemId']
    const newUuid = this.getUuidForNewEntity()
    const proxy = context.getProxy(args.uuid)
    if (!proxy) {
      return
    }

    // Create library item if it doesn't already exist.
    if (!libraryItemId) {
      libraryItemId = this.getUuidForNewEntity('library_item')
      this.configuration['libraryItemId'] = libraryItemId
    }

    let libraryItem =
      entityStorageManager.storages.library_item.load(libraryItemId)

    if (!libraryItem) {
      libraryItem = new LibraryItem(libraryItemId)
      libraryItem.setValues({
        blocks: [{ uuid: args.uuid }],
        title: args.label,
      })
      entityStorageManager.storages.library_item.add(libraryItem)
    }

    // Add the from_library block.
    const libraryBlock = entityStorageManager.createBlock(
      'from_library',
      newUuid,
    )
    libraryBlock.setValues({
      libraryItem: libraryItemId,
    })
    libraryBlock
      .options()
      .setList(JSON.parse(JSON.stringify(proxy.block.options().list)))
    const libraryProxy = new BlockProxy(
      libraryBlock,
      proxy.hostEntityType,
      proxy.hostEntityUuid,
      proxy.hostField,
    )

    context.addProxy(libraryProxy, args.uuid)
    context.removeProxy(args.uuid)
  }
}
