<template>
  <button
    type="button"
    class="hidden lg:flex absolute top-1 bottom-1 z-actions w-40 cursor-pointer bg-mono-950/90 hover:bg-mono-700 items-center justify-center"
    :class="
      side === 'left'
        ? 'left-0 border-r border-r-mono-700'
        : 'right-0 border-l border-l-mono-700'
    "
    @pointerdown="onPointerDown"
  >
    <Icon
      :name="
        side === 'left' ? 'bk_mdi_chevron_backward' : 'bk_mdi_chevron_forward'
      "
      class="fill-current pointer-events-none size-30"
    />
  </button>
</template>

<script lang="ts" setup>
import { onBeforeUnmount } from '#imports'
import { Icon } from '#blokkli/editor/components'

defineProps<{
  side: 'left' | 'right'
}>()

const emit = defineEmits<{
  start: []
  end: []
}>()

let isPressed = false

function onRelease() {
  if (!isPressed) {
    return
  }
  isPressed = false
  window.removeEventListener('pointerup', onRelease)
  window.removeEventListener('pointercancel', onRelease)
  emit('end')
}

function onPointerDown() {
  if (isPressed) {
    return
  }
  isPressed = true
  // Listen on the window so the release fires even if the button gets hidden
  // (v-show=false the instant scrollX hits maxScroll) or unmounted mid-press.
  // Pointer capture on the button is brittle in that scenario across browsers.
  window.addEventListener('pointerup', onRelease)
  window.addEventListener('pointercancel', onRelease)
  emit('start')
}

onBeforeUnmount(onRelease)
</script>

<script lang="ts">
export default {
  name: 'ActionsScrollArrow',
}
</script>
