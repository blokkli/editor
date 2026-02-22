import { BlockProxy, type MutationContext } from '#mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '#mock/entityStorage'
import { MediaImage } from '#mock/state/Media/Media'

export type MutationAddImageFromClipboardArgs = {
  url: string
  fileName: string
  width: number
  height: number
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  preceedingUuid?: string | null
}

export class MutationAddImageFromClipboard extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('add_image_from_clipboard', configuration)
  }

  override execute(
    context: MutationContext,
    args: MutationAddImageFromClipboardArgs,
  ) {
    // Create a new media image entity.
    const mediaUuid = this.getUuidForNewEntity('new_media')
    const image = new MediaImage(mediaUuid)
    image.setValues({
      url: args.url,
      alt: args.fileName,
      filename: args.fileName,
      width: args.width.toString(),
      height: args.height.toString(),
    })
    entityStorageManager.getStorage('media').add(image)

    // Create a new image block referencing the media entity.
    const blockUuid = this.getUuidForNewEntity()
    const block = entityStorageManager.createBlock('image', blockUuid)
    block.setValues({
      imageReference: [mediaUuid],
    })

    const proxy = new BlockProxy(
      block,
      args.hostEntityType,
      args.hostEntityUuid,
      args.hostField,
    )

    context.addProxy(proxy, args.preceedingUuid)
  }
}
