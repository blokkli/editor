import { falsy } from '~~/helpers'
import { BlockText } from '#mock/state/Block/Text'
import { BlockProxy, type MutationContext } from '../../../state/EditState'
import { Mutation } from './../Mutation'
import { BlockButton } from '#mock/state/Block/Button'
import { entityStorageManager } from '#mock/entityStorage'
import type { Block } from '#mock/state/Block/Block'
import type { PluginConfigInputItem } from '#blokkli/types'
import { BlockCard } from '~/mock/state/Block/Card'
import type { FieldTextarea } from '~/mock/state/Field/Textarea'
import type { FieldText } from '~/mock/state/Field/Text'
import { BlockTitle } from '~/mock/state/Block/Title'

export type MutationTransformArgs = {
  pluginId: string
  uuids: string[]
  config?: PluginConfigInputItem[]
}

export class MutationTransform extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('transform', configuration)
  }

  override getAffectedUuid(): string | undefined {
    return Object.entries(this.configuration).find(([key]) =>
      key.startsWith('new_uuid_'),
    )?.[1]
  }

  override execute(context: MutationContext, args: MutationTransformArgs) {
    const proxies = context.getProxies(args.uuids)

    const config = (args.config ?? []).reduce<Record<string, string>>(
      (acc, item) => {
        acc[item.name] = item.value
        return acc
      },
      {},
    )

    if (args.pluginId === 'merge_texts') {
      const uuid = args.uuids[0]
      if (uuid) {
        this.mergeTexts(proxies, uuid)
      }
    } else if (args.pluginId === 'button_to_text') {
      this.buttonToText(proxies, context)
    } else if (args.pluginId === 'extract_text_to_blocks') {
      this.extractTextToBlocks(proxies, context)
    } else if (args.pluginId === 'search_replace') {
      this.searchAndReplace(proxies, config)
    }
  }
  searchAndReplace(proxies: BlockProxy[], config: Record<string, string>) {
    const search = config.search
    const replace = config.replace ?? ''

    if (!search) {
      return
    }

    proxies.forEach((proxy) => {
      const fields = proxy.block.getTextFields()

      fields.forEach((field) => {
        const text = field.getText()
        field.setText(text.replaceAll(search, replace))
      })
    })
  }

  mergeTexts(proxies: BlockProxy[], firstUuid: string) {
    if (proxies.length < 2) {
      return
    }
    const first = proxies.find((v) => v.block.uuid === firstUuid)?.block
    if (!(first instanceof BlockText)) {
      return
    }
    let text = ''

    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i]!
      const block = proxy.block
      if (block instanceof BlockText) {
        text += block.text().getText()
        if (block.uuid !== firstUuid) {
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
      const proxy = proxies[i]!
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

    if (!(textBlock instanceof BlockText) || !textProxy) {
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
      } else if (el instanceof HTMLAnchorElement) {
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
