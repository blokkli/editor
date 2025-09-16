<template>
  <PluginBlockIndicator
    v-for="item in items"
    id="anchor"
    :uuid="item.uuid"
    :label="'#' + item.id"
    icon="anchor"
    :key="item.uuid"
    @click="onClick(item)"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, ref, onMounted, onBeforeUnmount, useRoute } from '#imports'
import { PluginBlockIndicator } from '#blokkli/plugins'
import { emitMessage } from '#blokkli/helpers/eventBus'

const route = useRoute()

const { ui, $t, adapter } = useBlokkli()
const rootElement: HTMLElement = ui.providerElement()

function getLinkForClipboard(item: AnchorItem) {
  if (adapter.buildAnchorLink) {
    return adapter.buildAnchorLink(item.id, item.uuid)
  }

  return route.path + '#' + item.id
}

function onClick(item: AnchorItem) {
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

type AnchorItem = {
  uuid: string
  id: string
}

const items = ref<AnchorItem[]>([])

const trackedElements = new Map<Element, AnchorItem>()
let observer: MutationObserver | null = null

const getAnchorData = (el: Element): AnchorItem | null => {
  const uuid = el.getAttribute('data-uuid')
  const id = el.getAttribute('id')
  return uuid && id ? { uuid, id } : null
}

// Update the reactive array only when needed
const syncItems = () => {
  const newItems = Array.from(trackedElements.values())
  items.value = newItems
}

// Process a single element
const checkElement = (el: Element): boolean => {
  const data = getAnchorData(el)
  const isTracked = trackedElements.has(el)

  if (data && !isTracked) {
    // New element to track
    trackedElements.set(el, data)
    return true
  } else if (!data && isTracked) {
    // Element no longer qualifies
    trackedElements.delete(el)
    return true
  } else if (data && isTracked) {
    // Check if data changed
    const existing = trackedElements.get(el)!
    if (existing.uuid !== data.uuid || existing.id !== data.id) {
      trackedElements.set(el, data)
      return true
    }
  }

  return false
}

const processAddedNode = (node: Node): boolean => {
  if (node.nodeType !== Node.ELEMENT_NODE) return false

  let changed = false
  const el = node as Element

  if (el.hasAttribute('data-uuid') && el.hasAttribute('id')) {
    changed = checkElement(el) || changed
  }

  return changed
}

const processRemovedNode = (node: Node): boolean => {
  if (node.nodeType !== Node.ELEMENT_NODE) return false

  let changed = false
  const el = node as Element

  if (!el.id) {
    return false
  }

  if (trackedElements.delete(el)) {
    changed = true
  }

  const toRemove: Element[] = []
  for (const [trackedEl] of trackedElements) {
    if (node.contains(trackedEl)) {
      toRemove.push(trackedEl)
    }
  }

  for (const el of toRemove) {
    trackedElements.delete(el)
    changed = true
  }

  return changed
}

onMounted(() => {
  const elements = rootElement.querySelectorAll('[data-uuid][id]')
  for (const el of elements) {
    const data = getAnchorData(el)
    if (data) {
      trackedElements.set(el, data)
    }
  }
  syncItems()

  observer = new MutationObserver((mutations) => {
    let changed = false

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          changed = processAddedNode(node) || changed
        }

        for (const node of mutation.removedNodes) {
          changed = processRemovedNode(node) || changed
        }
      } else if (mutation.type === 'attributes') {
        const target = mutation.target as Element
        changed = checkElement(target) || changed
      }
    }

    if (changed) {
      syncItems()
    }
  })

  observer.observe(rootElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-uuid', 'id'],
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>
