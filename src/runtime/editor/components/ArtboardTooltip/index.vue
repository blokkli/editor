<template>
  <div
    ref="el"
    class="bk bk-artboard-tooltip"
    :class="'bk-is-' + placementY"
    :style="{
      '--bk-caret-x': caretX,
    }"
    @keydown="onKeyDown"
  >
    <div class="bk bk-artboard-tooltip-inner bk-caret-tooltip-inner">
      <div class="bk-artboard-tooltip-header">
        <div v-html="title" />
        <button @click="$emit('close')">
          <Icon :name="closeIcon" />
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import  {
useStickyToolbar,
  type PlacementVertical,
} from '#blokkli/editor/composables/useStickyToolbar'
import {
  useTemplateRef,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  watch,
} from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { Coord } from '#blokkli/types'
import {onBlokkliEvent, useFocusTrap }from '#blokkli/editor/composables'

const props = withDefaults(
  defineProps<{
    id: string
    title: string
    anchorEl?: HTMLElement | null
    anchorCoordinates?: Coord | null
    placementY?: PlacementVertical
    closeIcon?: BlokkliIcon
  }>(),
  {
    anchorEl: null,
    anchorCoordinates: null,
    closeIcon: 'bk_mdi_close',
    placementY: 'auto',
  },
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const el = useTemplateRef('el')

const { onKeyDown } = useFocusTrap({
  container: el,
  debugLabel: 'ArtboardTooltip: ' + props.id,
})

const { ui } = useBlokkli()

const { placementY, caretX } = useStickyToolbar(el, {
  getAnchorElement() {
    return props.anchorEl ?? null
  },
  getAnchorCoordinates() {
    return props.anchorCoordinates ?? null
  },
  getPlacementY() {
    return props.placementY
  },
  getPlacementX() {
    return 'center'
  },
  getCaretWidth() {
    return 30
  },
})

watch(ui.openTooltip, (id) => {
  if (id !== props.id) {
    emit('close')
  }
})

onBlokkliEvent('keyPressed', (e) => {
  if (ui.hasDialogOpen.value) {
    return
  }

  if (e.code === 'Escape') {
    emit('close')
  }
})

onMounted(() => {
  ui.openTooltip.value = props.id
})

onBeforeUnmount(() => {
  if (ui.openTooltip.value === props.id) {
    ui.openTooltip.value = ''
  }
})
</script>
