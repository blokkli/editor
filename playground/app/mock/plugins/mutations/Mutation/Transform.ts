import { falsy } from '#blokkli/helpers'
import { BlockText } from '~/app/mock/state/Block/Text'
import type { BlockProxy, MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'

export type MutationTransformArgs = {
  pluginId: string
  uuids: string[]
}

export class MutationTransform extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('transform', configuration)
  }

  execute(context: MutationContext, args: MutationTransformArgs) {
    const proxies = args.uuids
      .map((uuid) => context.getProxy(uuid))
      .filter(falsy)
    if (proxies.length < 2) {
      return
    }

    if (args.pluginId === 'merge_texts') {
      this.mergeTexts(proxies)
    }
  }

  mergeTexts(proxies: BlockProxy[]) {
    let first: BlockText | null = null
    let text = ''

    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i]
      const block = proxy.block
      if (block instanceof BlockText) {
        text += block.text().getText()
        if (!first) {
          first = block
        } else {
          proxy.markAsDeleted()
        }
      }
    }

    if (first) {
      first.text().setText(text)
    }
  }
}
