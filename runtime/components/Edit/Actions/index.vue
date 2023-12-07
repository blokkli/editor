<template>
  <Teleport to="body">
    <div
      v-show="selection.blocks.value.length && !selection.isDragging.value"
      class="bk bk-blokkli-item-actions bk-control"
      @click.stop
    >
      <div :style="styleSize" class="bk-blokkli-item-actions-overlay">
        <div
          v-for="rect in selectedRects"
          :style="{
            width: rect.width + 'px',
            height: rect.height + 'px',
            transform: `translate(${rect.x}px, ${rect.y}px)`,
          }"
        ></div>
      </div>

      <div class="bk-blokkli-item-actions-inner" :style="innerStyle">
        <div class="bk-blokkli-item-actions-controls">
          <div id="bk-blokkli-item-actions-title">
            <button
              class="bk-blokkli-item-actions-type-button"
              @click.prevent="showDropdown = !showDropdown"
              :disabled="!shouldRenderButton"
              :class="{
                'is-open': showDropdown,
                'is-interactive': shouldRenderButton,
              }"
            >
              <div class="bk-blokkli-item-actions-title-icon">
                <ItemIcon v-if="itemBundle" :bundle="itemBundle.id" />
                <Icon name="selection" v-else />
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
              class="bk-blokkli-item-actions-type-dropdown"
              id="bk-blokkli-item-actions-dropdown"
            />
          </div>

          <div
            class="bk-blokkli-item-actions-buttons"
            id="bk-blokkli-item-actions"
          />

          <div
            class="bk-blokkli-item-actions-buttons"
            id="bk-blokkli-item-actions-options"
          />
        </div>
        <div id="bk-blokkli-item-actions-after" />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { falsy, modulo, getBounds, onlyUnique } from '#blokkli/helpers'
import { AnimationFrameEvent, KeyPressedEvent } from '#blokkli/types'
import { ItemIcon, Icon } from '#blokkli/components'
import type {
  PluginMountEvent,
  PluginUnmountEvent,
  Rectangle,
} from '#blokkli/types'

const { selection, eventBus, dom, text, types, state } = useBlokkli()

const editingEnabled = computed(() => state.editMode.value === 'editing')

const showDropdown = ref(false)

watch(selection.blocks, () => {
  showDropdown.value = false
})

const bounds = ref<Rectangle>({ width: 0, height: 0, x: 0, y: 0 })
const selectedRects = ref<Rectangle[]>([])

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

const innerStyle = computed(() => {
  const x = Math.max(bounds.value.x, 80)
  const y = Math.min(Math.max(bounds.value.y, 120), window.innerHeight)
  return {
    transform: `translate(${x}px, ${y}px)`,
  }
})

const styleSize = computed(() => {
  if (!bounds.value) {
    return {}
  }

  const { width, height, x, y } = bounds.value

  return {
    transform: `translate(${x}px, ${y}px)`,
    width: width + 'px',
    height: height + 'px',
  }
})

function onAnimationFrame(e: AnimationFrameEvent) {
  if (!selection.blocks.value.length) {
    return
  }
  const rects = selection.blocks.value
    .map((v) => {
      return e.rects[v.uuid]
    })
    .filter(falsy)
  const newBounds = getBounds(rects)
  if (newBounds) {
    bounds.value.y = newBounds.y
    bounds.value.x = newBounds.x
    bounds.value.width = newBounds.width
    bounds.value.height = newBounds.height
  }

  if (selection.blocks.value.length === 1) {
    selectedRects.value = []
  } else {
    selectedRects.value = selection.blocks.value
      .map((v) => {
        const rect = e.rects[v.uuid]
        if (rect) {
          return {
            width: rect.width,
            height: rect.height,
            y: rect.y - bounds.value.y,
            x: rect.x - bounds.value.x,
          }
        }
      })
      .filter(falsy)
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

const mountedPlugins = ref<PluginMountEvent[]>([])

const shouldRenderButton = computed(() => {
  return mountedPlugins.value.some((v) => v.isRendering)
})

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
