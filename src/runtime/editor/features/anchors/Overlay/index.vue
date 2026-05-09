<template>
  <PluginBlockIndicator
    v-for="item in items"
    id="anchor"
    :key="item.uuid"
    :uuid="item.uuid"
    :label="'#' + item.id"
    icon="bk_mdi_anchor"
    @click="onClick(item)"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, useRoute, ref, onMounted } from '#imports'
import { PluginBlockIndicator } from '#blokkli/editor/plugins'
import { onBlokkliEvent } from '#blokkli/editor/composables'

type Item = {
  id: string
  uuid: string
}

const route = useRoute()

const { adapter, ui } = useBlokkli()

function getAnchorItems(): Item[] {
  const anchorItems: Item[] = []

  const nodes = [...ui.providerElement.querySelectorAll('[id]')]

  for (const element of nodes) {
    if (!(element instanceof HTMLElement)) {
      continue
    }

    const block = element.closest('[data-bk-uuid]')
    if (!(block instanceof HTMLElement)) {
      continue
    }

    const uuid = block.dataset.bkUuid
    if (!uuid) {
      continue
    }

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
}

const items = ref<Item[]>([])

function getLinkForClipboard(item: Item) {
  if (adapter.buildAnchorLink) {
    return adapter.buildAnchorLink(item.id, item.uuid)
  }

  return route.path + '#' + item.id
}

function onClick(item: Item) {
  const link = getLinkForClipboard(item)
  ui.copyTextToClipboard(link)
}

onBlokkliEvent('state:reloaded', () => {
  items.value = getAnchorItems()
})

onMounted(() => {
  items.value = getAnchorItems()
})
</script>
