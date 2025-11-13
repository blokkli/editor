<template>
  <BlokkliTransition name="fade">
    <div
      v-if="isVisible"
      class="bk bk-overlay"
      @click.prevent.stop.capture="onClick"
      @dblclick.prevent="onDoubleClick"
      @wheel.capture.stop.prevent
      @pointerdown.capture.stop.prevent
      @pointermove.capture.stop.prevent
      @touchstart.capture.stop.prevent
      @touchmove.capture.stop.prevent
      @touchend.capture.stop.prevent
    >
      <div
        v-if="showDoubleClickInfo"
        :class="{
          'bk-is-left': alignment === 'right' || alignment === 'center',
          'bk-is-right': alignment === 'left',
        }"
      >
        <Icon name="click" />
        <div v-html="infoText" />
      </div>
    </div>
  </BlokkliTransition>
</template>

<script setup lang="ts">
import { BlokkliTransition, Icon } from '#blokkli/components'
import { computed, useBlokkli, ref, watch } from '#imports'

const { ui, eventBus, $t } = useBlokkli()

let clickTimeout: number | null = null

const showDoubleClickInfo = ref(false)

const alignment = computed(() => ui.currentDialog.value?.alignment)

const infoText = computed(() =>
  $t(
    'overlayDoubleClickInfo',
    '<strong>Double click</strong> to close overlay',
  ),
)

function onClick() {
  if (clickTimeout) {
    return
  }

  clickTimeout = window.setTimeout(() => {
    showDoubleClickInfo.value = true
  }, 500)
}

const isVisible = computed(() => ui.hasDialogOpen.value)

watch(isVisible, () => {
  if (clickTimeout) {
    window.clearTimeout(clickTimeout)
    clickTimeout = null
  }
  showDoubleClickInfo.value = false
})

function onDoubleClick() {
  if (clickTimeout) {
    window.clearTimeout(clickTimeout)
    clickTimeout = null
  }
  eventBus.emit('overlay:close')
  showDoubleClickInfo.value = false
}
</script>
