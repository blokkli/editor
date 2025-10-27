<template>
  <PluginBlockIndicator
    v-for="item in items"
    id="anchor"
    :key="item.uuid"
    :uuid="item.uuid"
    :label="'#' + item.id"
    icon="anchor"
    @click="onClick(item)"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, useRoute, computed } from '#imports'
import { PluginBlockIndicator } from '#blokkli/plugins'
import { emitMessage } from '#blokkli/helpers/eventBus'

type Item = {
  id: string
  uuid: string
}

const route = useRoute()

const { $t, adapter, dom } = useBlokkli()

const items = computed(() => {
  const anchorItems: Item[] = []

  for (const entry of Object.entries(dom.registeredBlocks.value)) {
    const uuid = entry[0]
    const element = entry[1]
    if (!element || !uuid) {
      continue
    }

    if (element.id) {
      anchorItems.push({
        id: element.id,
        uuid,
      })
    }
  }

  return anchorItems
})

function getLinkForClipboard(item: Item) {
  if (adapter.buildAnchorLink) {
    return adapter.buildAnchorLink(item.id, item.uuid)
  }

  return route.path + '#' + item.id
}

function onClick(item: Item) {
  if (navigator.clipboard?.writeText) {
    const link = getLinkForClipboard(item)
    navigator.clipboard.writeText(link)
    const message = $t(
      'copiedToClipboardMessage',
      '"@text" has been copied to your clipboard',
    ).replace('@text', link)
    emitMessage(message, 'success', undefined, true)
  }
}
</script>
