import { falsy } from '~~/helpers'
import { BlockText } from '#mock/state/Block/Text'
import { BlockProxy, type MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'
import { BlockButton } from '#mock/state/Block/Button'
import { entityStorageManager } from '#mock/entityStorage'
import type { Block } from '#mock/state/Block/Block'

export type MutationHostTransformArgs = {
  pluginId: string
}

export class MutationHostTransform extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('transform_host', configuration)
  }

  override execute(context: MutationContext, args: MutationHostTransformArgs) {
    // @TODO
  }
}
