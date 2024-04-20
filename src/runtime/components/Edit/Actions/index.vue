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
                'bk-is-fragment': itemBundle?.id === 'blokkli_fragment',
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
import { watch, ref, computed, useBlokkli } from '#imports'
import { onlyUnique, findIdealRectPosition, falsy } from '#blokkli/helpers'
import type { Rectangle, PluginMountEvent } from '#blokkli/types'
import { ItemIcon, Icon } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { getFragmentDefinition } from '#blokkli/definitions'

const { selection, $t, types, state, ui } = useBlokkli()

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

const title = computed(() => {
  if (itemBundle.value) {
    if (itemBundle.value.id === 'blokkli_fragment') {
      const fragments = state.renderedBlocks.value
        .filter((v) => selection.uuids.value.includes(v.item.uuid))
        .map((v) => {
          const name = v.item.props?.name
          if (name) {
            const definition = getFragmentDefinition(name)
            return definition?.label
          }
        })
        .filter(falsy)

      if (fragments.length && fragments.length < 3) {
        return fragments.join(', ')
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

onBlokkliEvent('animationFrame', () => {
  if (!selection.blocks.value.length || ui.isMobile.value) {
    return
  }

  let minX = 0
  let minY = 0
  const rects = selection.rects.value
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

  const controlsWidth = controlsEl.value ? controlsEl.value.scrollWidth : 500
  const rect = limitPlacedRect({
    x: minX,
    y: minY - ACTIONS_HEIGHT - 15,
    width: controlsWidth,
    height: ACTIONS_HEIGHT,
  })

  const ideal = findIdealRectPosition(
    ui.viewportBlockingRects.value,
    rect,
    ui.visibleViewportPadded.value,
  )

  x.value = ideal.x
  y.value = ideal.y
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
