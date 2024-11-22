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
        ref="el"
        class="bk-blokkli-item-actions-inner"
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
              :title="title"
              :class="{
                'is-open': showDropdown,
                'is-interactive': shouldRenderButton,
                'bk-is-reusable': itemBundle?.id === 'from_library',
                'bk-is-fragment': itemBundle?.id === 'blokkli_fragment',
              }"
              @click.prevent="showDropdown = !showDropdown"
            >
              <div class="bk-blokkli-item-actions-title-icon">
                <ItemIcon v-if="bundleIcon" :bundle="bundleIcon" />
                <Icon v-else name="selection" />
              </div>
              <span class="bk-blokkli-item-actions-title-label">{{
                title
              }}</span>
              <span
                v-if="selection.blocks.value.length > 1"
                class="bk-blokkli-item-actions-title-count"
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
  onBeforeUnmount,
} from '#imports'
import { onlyUnique, findIdealRectPosition, falsy } from '#blokkli/helpers'
import type { Rectangle, PluginMountEvent } from '#blokkli/types'
import { ItemIcon, Icon } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { getFragmentDefinition } from '#blokkli/definitions'

const { selection, $t, types, state, ui, dom } = useBlokkli()

const editingEnabled = computed(() => state.editMode.value === 'editing')

const ACTIONS_HEIGHT = 50

const el = ref<HTMLDivElement | null>(null)

const controlsEl = ref<HTMLElement | null>(null)
const mountedPlugins = ref<PluginMountEvent[]>([])
const showDropdown = ref(false)

watch(selection.blocks, () => {
  showDropdown.value = false
})

const bundleIcon = computed(() => {
  if (itemBundle.value?.id === 'from_library') {
    const reusableBundle = selection.blocks.value[0]?.reusableBundle
    if (reusableBundle) {
      return reusableBundle
    }
  }

  return itemBundle.value?.id
})

const title = computed(() => {
  if (itemBundle.value) {
    if (itemBundle.value.id === 'blokkli_fragment') {
      const fragments = selection.uuids.value
        .map((uuid) => {
          const item = state.getFieldListItem(uuid)
          if (!item) {
            return
          }
          const name = item.props?.name
          if (!name) {
            return
          }
          const definition = getFragmentDefinition(name)
          return definition?.label
        })
        .filter(falsy)

      if (fragments.length && fragments.length < 3) {
        return fragments.join(', ')
      }
    } else if (itemBundle.value.id === 'from_library') {
      const title = selection.blocks.value[0]?.editTitle
      if (title) {
        return title
      }
    }
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
  const bundle = itemBundleIds.value[0]
  return types.getBlockBundleDefinition(bundle)
})

const limitPlacedRect = (rect: Rectangle, padding: Rectangle): Rectangle => {
  return {
    width: rect.width,
    height: rect.height,
    x: Math.min(
      Math.max(rect.x, padding.x),
      padding.x + padding.width - rect.width,
    ),
    y: Math.min(
      Math.max(padding.y, rect.y),
      padding.height + padding.y - rect.height,
    ),
  }
}

let scrollWidth = 0

const observer = new ResizeObserver((entries) => {
  const size = entries[0]?.contentBoxSize?.[0]
  if (!size) {
    return
  }

  scrollWidth = size.inlineSize
})

onMounted(() => {
  if (controlsEl.value) {
    observer.observe(controlsEl.value)
  }
})

onBeforeUnmount(() => {
  if (controlsEl.value) {
    observer.unobserve(controlsEl.value)
    observer.disconnect()
  }
})

onBlokkliEvent('canvas:draw', () => {
  if (!selection.blocks.value.length || ui.isMobile.value) {
    return
  }

  let minX = 0
  let minY = 0
  const rects = selection.uuids.value
    .map((uuid) => dom.getBlockRect(uuid))
    .filter(falsy)

  if (!rects.length) {
    return
  }

  const offset = ui.artboardOffset.value
  const scale = ui.artboardScale.value

  for (let i = 0; i < rects.length; i++) {
    const { x, y } = rects[i]
    const rectX = (x + offset.x / scale) * scale
    const rectY = (y + offset.y / scale) * scale
    if (i === 0 || rectX < minX) {
      minX = rectX
    }
    if (i === 0 || rectY < minY) {
      minY = rectY
    }
  }

  const padding = ui.visibleViewportPadded.value
  const rect = limitPlacedRect(
    {
      x: minX,
      y: minY - ACTIONS_HEIGHT - 15,
      width: scrollWidth,
      height: ACTIONS_HEIGHT,
    },
    padding,
  )

  const ideal = findIdealRectPosition(
    ui.viewportBlockingRects.value,
    rect,
    padding,
  )

  if (el.value) {
    el.value.style.transform = ui.isMobile.value
      ? ''
      : `translate3d(${Math.round(ideal.x)}px, ${Math.round(ideal.y)}px, 0)`
  }
})

const shouldRenderButton = computed(() =>
  mountedPlugins.value.some((v) => v.isRendering),
)

onBlokkliEvent('plugin:mount', (e) => {
  if (e.type !== 'ItemDropdown') {
    return
  }
  mountedPlugins.value.push(e as any)
})

onBlokkliEvent('plugin:unmount', (e) => {
  if (e.type !== 'ItemDropdown') {
    return
  }
  mountedPlugins.value = mountedPlugins.value.filter((v) => v.type !== e.id)
})
</script>

<script lang="ts">
export default {
  name: 'ItemActions',
}
</script>
