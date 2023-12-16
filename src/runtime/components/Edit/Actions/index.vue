<template>
  <Teleport to="body">
    <div
      v-show="
        selection.blocks.value.length &&
        !selection.isDragging.value &&
        !selection.editableActive.value
      "
      class="bk bk-blokkli-item-actions bk-control"
      @click.stop
    >
      <div class="bk-blokkli-item-actions-inner" :style="innerStyle">
        <div class="bk-blokkli-item-actions-controls">
          <div id="bk-blokkli-item-actions-title">
            <button
              class="bk-blokkli-item-actions-type-button"
              :disabled="!shouldRenderButton"
              :class="{
                'is-open': showDropdown,
                'is-interactive': shouldRenderButton,
              }"
              @click.prevent="showDropdown = !showDropdown"
            >
              <div class="bk-blokkli-item-actions-title-icon">
                <ItemIcon v-if="itemBundle" :bundle="itemBundle.id" />
                <Icon v-else name="selection" />
              </div>
              <span>{{ title }}</span>
              <span
                class="bk-blokkli-item-actions-title-count"
                :class="{ 'bk-is-hidden': selection.blocks.value.length <= 1 }"
                >{{ selection.blocks.value.length }}</span
              >
              <Icon v-if="shouldRenderButton" name="caret" class="bk-caret" />
            </button>
            <div
              v-show="showDropdown && editingEnabled"
              id="bk-blokkli-item-actions-dropdown"
              class="bk-blokkli-item-actions-type-dropdown"
            />
          </div>

          <div
            id="bk-blokkli-item-actions"
            class="bk-blokkli-item-actions-buttons"
          />

          <div
            id="bk-blokkli-item-actions-options"
            class="bk-blokkli-item-actions-buttons"
          />
        </div>
        <div id="bk-blokkli-item-actions-after" />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import {
  watch,
  ref,
  computed,
  useBlokkli,
  onMounted,
  onUnmounted,
} from '#imports'

import { modulo, onlyUnique } from '#blokkli/helpers'
import type { AnimationFrameEvent, KeyPressedEvent } from '#blokkli/types'
import { ItemIcon, Icon } from '#blokkli/components'
import type { PluginMountEvent, PluginUnmountEvent } from '#blokkli/types'

const { selection, eventBus, dom, text, types, state, ui } = useBlokkli()

const editingEnabled = computed(() => state.editMode.value === 'editing')

const PADDING = 10
const ACTIONS_HEIGHT = 50

const mountedPlugins = ref<PluginMountEvent[]>([])
const showDropdown = ref(false)
const x = ref(0)
const y = ref(0)

watch(selection.blocks, () => {
  showDropdown.value = false
})

const title = computed(() => {
  if (itemBundle.value) {
    return itemBundle.value.label
  }

  return text('multipleItemsLabel')
})

const itemBundleIds = computed(() =>
  selection.blocks.value.map((v) => v.itemBundle).filter(onlyUnique),
)

const itemBundle = computed(() => {
  if (itemBundleIds.value.length !== 1) {
    return
  }
  return itemBundleIds.value
    ? types.allTypes.value.find((v) => v.id === itemBundleIds.value[0])
    : undefined
})

const innerStyle = computed(() => ({
  transform: `translate(${x.value}px, ${y.value}px)`,
}))

function onAnimationFrame(e: AnimationFrameEvent) {
  if (!selection.blocks.value.length) {
    return
  }

  const el = document.querySelector('.bk-selection')
  if (el && el instanceof HTMLElement) {
    const rect = el.getBoundingClientRect()
    const rootRect = ui.rootElement().getBoundingClientRect()
    x.value = Math.max(rect.x, rootRect.x + PADDING)
    y.value = Math.min(
      Math.max(rect.y - ACTIONS_HEIGHT - PADDING, rootRect.y + PADDING),
      rootRect.height - PADDING,
    )
  }
}

function onKeyPressed(e: KeyPressedEvent) {
  if (selection.blocks.value.length !== 1) {
    return
  }
  if (e.code !== 'Tab') {
    return
  }

  e.originalEvent.preventDefault()

  const items = dom.getAllBlocks()
  if (!items.length) {
    return
  }

  const currentIndex = selection.blocks.value[0]
    ? items.findIndex((v) => v.uuid === selection.blocks.value[0].uuid)
    : -1

  const targetIndex = modulo(
    e.shift ? currentIndex - 1 : currentIndex + 1,
    items.length,
  )
  const targetItem = items[targetIndex]
  if (!targetItem) {
    return
  }

  eventBus.emit('select', targetItem.uuid)
  eventBus.emit('scrollIntoView', { uuid: targetItem.uuid })
}

const shouldRenderButton = computed(() =>
  mountedPlugins.value.some((v) => v.isRendering),
)

const onPluginMount = (e: PluginMountEvent) => {
  if (e.type !== 'ItemDropdown') {
    return
  }
  mountedPlugins.value.push(e as any)
}
const onPluginUnmount = (e: PluginUnmountEvent) => {
  if (e.type !== 'ItemDropdown') {
    return
  }
  mountedPlugins.value = mountedPlugins.value.filter((v) => v.type !== e.id)
}

onMounted(() => {
  eventBus.on('animationFrame', onAnimationFrame)
  eventBus.on('keyPressed', onKeyPressed)
  eventBus.on('plugin:mount', onPluginMount)
  eventBus.on('plugin:unmount', onPluginUnmount)
})

onUnmounted(() => {
  eventBus.off('animationFrame', onAnimationFrame)
  eventBus.off('keyPressed', onKeyPressed)
  eventBus.off('plugin:mount', onPluginMount)
  eventBus.off('plugin:unmount', onPluginUnmount)
})
</script>

<script lang="ts">
export default {
  name: 'ItemActions',
}
</script>
