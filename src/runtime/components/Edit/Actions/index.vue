<template>
  <Teleport to="body">
    <div class="bk bk-blokkli-item-actions bk-control" @click.stop>
      <div
        v-show="
          selection.blocks.value.length &&
          !selection.isDragging.value &&
          !selection.editableActive.value &&
          !ui.isAnimating.value
        "
        class="bk-blokkli-item-actions-inner"
        :style="innerStyle"
      >
        <div
          id="bk-blokkli-item-actions-controls"
          ref="controlsEl"
          class="bk-blokkli-item-actions-controls"
        >
          <div id="bk-blokkli-item-actions-title">
            <button
              class="bk-blokkli-item-actions-type-button"
              :disabled="!shouldRenderButton"
              :class="{
                'is-open': showDropdown,
                'is-interactive': shouldRenderButton,
                'bk-is-reusable': itemBundle?.id === 'from_library',
              }"
              @click.prevent="showDropdown = !showDropdown"
            >
              <div class="bk-blokkli-item-actions-title-icon">
                <ItemIcon v-if="itemBundle" :bundle="itemBundle.id" />
                <Icon v-else name="selection" />
              </div>
              <span class="bk-blokkli-item-actions-title-label">{{
                title
              }}</span>
              <span
                class="bk-blokkli-item-actions-title-count"
                :class="{
                  'bk-is-hidden': selection.blocks.value.length <= 1,
                }"
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

          <div id="bk-blokkli-item-actions-after" />

          <div
            id="bk-blokkli-item-actions"
            class="bk-blokkli-item-actions-buttons"
          />
        </div>
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
import { intersects, onlyUnique } from '#blokkli/helpers'
import { easeOutSine } from '#blokkli/helpers/easing'
import type { KeyPressedEvent, Rectangle } from '#blokkli/types'
import { ItemIcon, Icon } from '#blokkli/components'
import type { PluginMountEvent, PluginUnmountEvent } from '#blokkli/types'

const { selection, eventBus, $t, types, state, ui, animation } = useBlokkli()

const editingEnabled = computed(() => state.editMode.value === 'editing')

const ACTIONS_HEIGHT = 50

const controlsEl = ref<HTMLElement | null>(null)
const mountedPlugins = ref<PluginMountEvent[]>([])
const showDropdown = ref(false)
const x = ref(0)
const y = ref(0)

watch(selection.blocks, () => {
  showDropdown.value = false
})

watch(ui.isMobile, (isMobile) => {
  eventBus.off('animationFrame', onAnimationFrame)

  if (!isMobile) {
    eventBus.on('animationFrame', onAnimationFrame)
  }
})

const title = computed(() => {
  if (itemBundle.value) {
    return itemBundle.value.label
  }

  return $t('multipleItemsLabel', 'Items')
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
  if (ui.isMobile.value) {
    return {}
  }
  return {
    transform: `translate(${Math.round(x.value)}px, ${Math.round(y.value)}px)`,
  }
})

/**
 * Position the given rectToPlace so that it doesn't overlap with any of the blockingRects.
 */
function findIdealPosition(
  blockingRects: Rectangle[],
  rectToPlace: Rectangle,
  viewport: Rectangle,
  maxOverlap = 60,
): { x: number; y: number } {
  let targetX = rectToPlace.x

  for (const blockingRect of blockingRects) {
    if (intersects(rectToPlace, blockingRect)) {
      const a = Math.abs(rectToPlace.y + rectToPlace.height - blockingRect.y)
      const b = Math.abs(blockingRect.y + blockingRect.height - rectToPlace.y)
      const verticalOverlap = Math.min(a, b)

      const smoothingFactor = easeOutSine(
        Math.min(verticalOverlap, maxOverlap) / maxOverlap,
      )

      if (
        rectToPlace.x + rectToPlace.width / 2 >
        blockingRect.x + blockingRect.width / 2
      ) {
        targetX = blockingRect.x + blockingRect.width
      } else {
        targetX = blockingRect.x - rectToPlace.width
      }
      // Adjust targetX based on the smoothing factor
      targetX = rectToPlace.x + smoothingFactor * (targetX - rectToPlace.x)
      break
    }
  }

  return {
    x: Math.min(
      Math.max(targetX, viewport.x),
      viewport.x + viewport.width - rectToPlace.width,
    ),
    y: Math.min(
      Math.max(viewport.y, rectToPlace.y),
      viewport.height + viewport.y - rectToPlace.height,
    ),
  }
}

const limitPlacedRect = (rect: Rectangle): Rectangle => {
  return {
    width: rect.width,
    height: rect.height,
    x: Math.min(
      Math.max(rect.x, ui.visibleViewportPadded.value.x),
      ui.visibleViewportPadded.value.x +
        ui.visibleViewportPadded.value.width -
        rect.width,
    ),
    y: Math.min(
      Math.max(ui.visibleViewportPadded.value.y, rect.y),
      ui.visibleViewportPadded.value.height +
        ui.visibleViewportPadded.value.y -
        rect.height,
    ),
  }
}

function onAnimationFrame() {
  if (!selection.blocks.value.length) {
    return
  }

  const el = document.querySelector('.bk-selection')
  const controlsWidth = controlsEl.value ? controlsEl.value.scrollWidth : 500
  if (el && el instanceof HTMLElement) {
    const boundingRect = el.getBoundingClientRect()
    const rect = limitPlacedRect({
      x: boundingRect.x,
      y: boundingRect.y - ACTIONS_HEIGHT - 15,
      width: controlsWidth,
      height: ACTIONS_HEIGHT,
    })

    const ideal = findIdealPosition(
      ui.viewportBlockingRects.value,
      rect,
      ui.visibleViewportPadded.value,
    )

    x.value = ideal.x
    y.value = ideal.y
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

  e.shift ? eventBus.emit('select:previous') : eventBus.emit('select:next')
  animation.requestDraw()
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
  if (!ui.isMobile.value) {
    eventBus.on('animationFrame', onAnimationFrame)
  }
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
