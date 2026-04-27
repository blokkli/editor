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
        class="bk-overlay-inner"
        :class="{
          'bk-is-left': alignment === 'right' || alignment === 'center',
          'bk-is-right': alignment === 'left',
        }"
      >
        <Icon name="bk_mdi_web_traffic" />
        <div v-html="infoText" />
      </div>
    </div>
  </BlokkliTransition>
</template>

<script setup lang="ts">
import { BlokkliTransition, Icon } from '#blokkli/editor/components'
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

  if (!ui.currentDialog.value?.confirmClose) {
    onDoubleClick()
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

<style lang="postcss">
.bk.bk-overlay {
  @apply fixed top-0 left-0 w-screen bottom-0 pointer-events-auto z-overlay;
  @apply bg-mono-800/95;
  @apply flex items-start;

  > .bk-overlay-inner {
    @apply text-base text-mono-100 bg-mono-300/20 m-20;
    @apply py-10 pl-10 pr-15;
    @apply inline-flex items-center gap-10;
    @apply border border-mono-500 h-auto grow-0;

    &.bk-is-right {
      @apply ml-auto;
    }

    .bk-icon {
      @apply size-25;

      svg {
        @apply fill-current;
      }
    }
  }
}
</style>
