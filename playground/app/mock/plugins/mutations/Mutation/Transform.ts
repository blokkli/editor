import { falsy } from '#blokkli/helpers'
import { BlockText } from '~/app/mock/state/Block/Text'
import { BlockProxy, type MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'
import { BlockButton } from '~/app/mock/state/Block/Button'
import { entityStorageManager } from '~/app/mock/entityStorage'
import type { Block } from '~/app/mock/state/Block/Block'

export type MutationTransformArgs = {
  pluginId: string
  uuids: string[]
}

export class MutationTransform extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('transform', configuration)
  }

  execute(context: MutationContext, args: MutationTransformArgs) {
    const proxies = context.getProxies(args.uuids)

    if (args.pluginId === 'merge_texts') {
      this.mergeTexts(proxies)
    } else if (args.pluginId === 'button_to_text') {
      this.buttonToText(proxies, context)
    } else if (args.pluginId === 'extract_text_to_blocks') {
      this.extractTextToBlocks(proxies, context)
    }
  }

  mergeTexts(proxies: BlockProxy[]) {
    if (proxies.length < 2) {
      return
    }
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

  buttonToText(proxies: BlockProxy[], context: MutationContext) {
    const links: string[] = []

    let firstProxy: BlockProxy | null = null

    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i]
      const block = proxy.block
      if (block instanceof BlockButton) {
        const title = block.getTitle()
        const url = block.getUrl()
        links.push(`<a href="${url}">${title}</a>`)
        proxy.markAsDeleted()

        if (!firstProxy) {
          firstProxy = proxy
        }
      }
    }

    if (!firstProxy) {
      return
    }

    const text =
      links.length > 1
        ? `<ul>${links.map((v) => '<li>' + v + '</li>').join('\n')}</ul>`
        : links.join('')

    const uuid = this.getUuidForNewEntity()
    const block = entityStorageManager.createBlock('text', uuid)
    block.setValues({ text })

    const proxy = new BlockProxy(
      block,
      firstProxy.hostEntityType,
      firstProxy.hostEntityUuid,
      firstProxy.hostField,
    )

    context.addProxy(proxy, firstProxy.block.uuid)
  }

  extractTextToBlocks(proxies: BlockProxy[], context: MutationContext) {
    const textProxy = proxies[0]
    const textBlock = textProxy?.block

    if (!(textBlock instanceof BlockText)) {
      return
    }

    textProxy.markAsDeleted()

    const text = textBlock.text().getText()

    const div = document.createElement('div')
    div.innerHTML = text

    const children = [...div.children]

    let i = 0

    const getUuid = (): string => {
      const uuid = this.getUuidForNewEntity('element_' + i)
      i++
      return uuid
    }

    const createBlock = (el: Element): Block | Block[] | undefined => {
      if (!(el instanceof HTMLElement)) {
        return
      }

      if (el.tagName === 'H2') {
        const block = entityStorageManager.createBlock('title', getUuid())
        block.setValues({
          title: el.innerText,
        })
        return block
      } else if (el.tagName === 'UL') {
        const listItems = [...el.querySelectorAll('li')]
        const isAllLinks = listItems.every((li) =>
          [...li.children].every((child) => child.tagName === 'A'),
        )
        if (isAllLinks) {
          return [...el.querySelectorAll('a')].map((a) => {
            const block = entityStorageManager.createBlock('button', getUuid())
            block.setValues({
              title: a.innerText,
              url: a.href,
            })
            return block
          })
        }
      } else if (el.tagName === 'A') {
        const block = entityStorageManager.createBlock('button', getUuid())
        block.setValues({
          title: el.innerText,
          url: el.href,
        })
        return block
      }

      const block = entityStorageManager.createBlock('text', getUuid())
      block.setValues({
        text: el.outerHTML,
      })
      return block
    }

    const newProxies: BlockProxy[] = children
      .flatMap((child) => {
        const block = createBlock(child)
        if (!block) {
          return
        }
        const blocks = Array.isArray(block) ? block : [block]
        return blocks.map((block) => {
          return new BlockProxy(
            block,
            textProxy.hostEntityType,
            textProxy.hostEntityUuid,
            textProxy.hostField,
          )
        })
      })
      .filter(falsy)
    let preceedingUuid = textProxy.block.uuid

    newProxies.forEach((proxy) => {
      context.addProxy(proxy, preceedingUuid)
      preceedingUuid = proxy.block.uuid
    })
  }
}
