<template>
  <PluginBlockIndicator
    v-for="item in items"
    id="anchor"
    :key="item.uuid"
    :uuid="item.uuid"
    :label="'#' + item.id"
    icon="bk_mdi_anchor"
    sticky
    @click="onClick(item)"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, useRoute, ref, onMounted } from '#imports'
import { PluginBlockIndicator } from '#blokkli/editor/plugins'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { renderCycle } from '#blokkli/editor/helpers/vue'

type Item = {
  id: string
  uuid: string
}

const route = useRoute()

const { adapter, ui } = useBlokkli()

/**
 * The elements whose id is an anchor: a block's own element and headings. Other
 * ids, such as those of a tab list and its panel, connect elements for
 * assistive technology and are often generated.
 */
const ANCHOR_SELECTOR = '[data-bk-uuid][id], :is(h1, h2, h3, h4, h5, h6)[id]'

/**
 * One item per block: its first anchor, in document order. A block's own
 * element comes before its children, so its id wins over a heading's. An
 * indicator is per block.
 */
function getAnchorItems(): Item[] {
  const anchorItems = new Map<string, Item>()

  for (const element of ui.providerElement.querySelectorAll(ANCHOR_SELECTOR)) {
    if (
      !(element instanceof HTMLElement) ||
      !element.id ||
      element.closest('form')
    ) {
      continue
    }

    const uuid = element.closest<HTMLElement>('[data-bk-uuid]')?.dataset.bkUuid
    if (uuid && !anchorItems.has(uuid)) {
      anchorItems.set(uuid, { id: element.id, uuid })
    }
  }

  return [...anchorItems.values()]
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

async function updateAnchorItems() {
  await renderCycle()
  items.value = getAnchorItems()
}

onBlokkliEvent('state:reloaded', updateAnchorItems)
onBlokkliEvent('option:update', updateAnchorItems)

onMounted(updateAnchorItems)
</script>
