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
            transform: `translate(${rect.left}px, ${rect.top}px)`,
          }"
        ></div>
      </div>

      <div class="bk-blokkli-item-actions-inner" :style="innerStyle">
        <div class="bk-blokkli-item-actions-controls">
          <div id="bk-blokkli-item-actions-title">
            <button
              class="bk-blokkli-item-actions-type-button is-interactive"
              @click.prevent="showDropdown = !showDropdown"
              :class="{
                'is-open': showDropdown,
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
              <Icon name="caret" class="bk-caret" />
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

type Rectangle = {
  left: number
  top: number
  width: number
  height: number
}

const { selection, eventBus, dom, text, types, state } = useBlokkli()

const editingEnabled = computed(() => state.editMode.value === 'editing')

const showDropdown = ref(false)

watch(selection.blocks, () => {
  showDropdown.value = false
})

const bounds = ref<Rectangle>({ width: 0, height: 0, left: 0, top: 0 })
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
  const x = Math.max(bounds.value.left, 80)
  const y = Math.min(Math.max(bounds.value.top, 120), window.innerHeight)
  return {
    transform: `translate(${x}px, ${y}px)`,
  }
})

const styleSize = computed(() => {
  if (!bounds.value) {
    return {}
  }

  const { width, height, left, top } = bounds.value

  return {
    transform: `translate(${left}px, ${top}px)`,
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
    bounds.value.top = newBounds.top
    bounds.value.left = newBounds.left
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
            top: rect.y - bounds.value.top,
            left: rect.x - bounds.value.left,
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

onMounted(() => {
  eventBus.on('animationFrame', onAnimationFrame)
  eventBus.on('keyPressed', onKeyPressed)
})

onUnmounted(() => {
  eventBus.off('animationFrame', onAnimationFrame)
  eventBus.off('keyPressed', onKeyPressed)
})
</script>

<script lang="ts">
export default {
  name: 'ItemActions',
}
</script>
