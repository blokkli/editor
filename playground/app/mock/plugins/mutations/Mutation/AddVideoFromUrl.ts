import { BlockProxy, type MutationContext } from '~/app/mock/state/EditState'
import { Mutation } from '../Mutation'
import { entityStorageManager } from '~/app/mock/entityStorage'
import { getBlockBundles } from '~/app/mock/state/Block'

export type MutationAddVideoFromUrlArgs = {
  url: string
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  preceedingUuid?: string
}

export class MutationAddVideoFromUrl extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('add_video_from_url', configuration)
  }

  execute(context: MutationContext, args: MutationAddVideoFromUrlArgs) {
    const uuid = this.getUuidForNewEntity()

    const block = entityStorageManager.createBlock('video', uuid)

    const videoUuid = this.getVideoUuid(args.url)

    block.setValues({
      video: [videoUuid],
    })

    const proxy = new BlockProxy(
      block,
      args.hostEntityType,
      args.hostEntityUuid,
      args.hostField,
    )

    context.addProxy(proxy, args.preceedingUuid)
  }

  getVideoUuid(url: string) {
    const existingVideo = entityStorageManager.getStorage('media').query({
      url,
    })[0]
    if (existingVideo) {
      return existingVideo.uuid
    }
    const video = entityStorageManager.createVideo(
      this.getUuidForNewEntity('new_video'),
      url,
      url,
    )
    return video.uuid
  }
}
