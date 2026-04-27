<template>
  <div
    ref="rootEl"
    class="bk bk-dialog bk-control"
    @wheel.passive.stop
    @keydown.stop="handleKeyDown"
    @keyup.stop
    @touchstart.passive.stop
    @touchmove.stop
    @touchend.stop
  >
    <div class="bk-dialog-inner" :style>
      <div class="bk bk-overlay-header">
        <Icon v-if="icon" :name="icon" />
        <h3>{{ title }}</h3>
        <button @click="$emit('cancel')">
          <Icon name="bk_mdi_close" />
        </button>
      </div>

      <slot name="tabs" />

      <div
        class="bk-dialog-content"
        :class="{
          'bk-is-fullscreen': fullScreen,
        }"
      >
        <div class="bk-dialog-content-inner">
          <div v-if="lead" class="bk bk-dialog-lead">
            {{ lead }}
          </div>
          <slot />
        </div>
      </div>
      <div v-if="$slots['pre-footer']" class="bk-dialog-pre-footer">
        <slot name="pre-footer" />
      </div>
      <div
        v-if="!hideButtons"
        class="bk bk-dialog-footer"
        :class="{
          'mt-0!': $slots['pre-footer'],
        }"
      >
        <button
          class="bk-button"
          :disabled="!canSubmit"
          :class="[
            { 'bk-is-loading': isLoading },
            isDanger ? 'bk-scheme-red' : 'bk-scheme-accent',
          ]"
          @click="$emit('submit')"
        >
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  useBlokkli,
  computed,
  useTemplateRef,
  onBeforeUnmount,
  watch,
} from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'
import { onBlokkliEvent, useFocusTrap } from '#blokkli/editor/composables'

const { ui } = useBlokkli()

const emit = defineEmits(['submit', 'cancel'])

const rootEl = useTemplateRef('rootEl')

const props = withDefaults(
  defineProps<{
    id: string
    title: string
    lead?: string
    width?: number | string
    submitLabel?: string
    canSubmit?: boolean
    isDanger?: boolean
    isLoading?: boolean
    hideButtons?: boolean
    icon?: BlokkliIcon
    fullScreen?: boolean
  }>(),
  {
    width: 600,
    canSubmit: true,
    lead: '',
    submitLabel: '',
    icon: undefined,
  },
)

watch(ui.currentDialog, (dialog) => {
  if (dialog?.id !== props.id) {
    emit('cancel')
  }
})

const style = computed(() => {
  if (ui.isMobile.value) {
    return {}
  }

  if (props.fullScreen) {
    return {
      maxWidth: '100vw',
      height: '100vh',
    }
  }

  if (typeof props.width === 'number') {
    return {
      maxWidth: props.width + 'px',
    }
  }

  return {
    width: props.width,
  }
})

const { onKeyDown } = useFocusTrap({
  container: rootEl,
  debugLabel: `Dialog "${props.title}"`,
})

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    e.preventDefault()
    emit('cancel')
    return
  }
  onKeyDown(e)
}

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'Escape') {
    emit('cancel')
  }
})

onBlokkliEvent('overlay:close', () => {
  emit('cancel')
})

ui.openDialog({ id: props.id, alignment: 'center' })

onBeforeUnmount(() => {
  ui.closeDialog(props.id)
})
</script>

<script lang="ts">
export default {
  name: 'BlokkliDialog',
}
</script>

<style lang="postcss">
.bk.bk-dialog {
  @apply fixed top-0 left-0 w-screen bottom-0  z-dialog lg:p-15 pointer-events-none;
  @apply flex items-center justify-center;

  .bk-dialog-inner {
    @apply w-full lg:min-w-[450px] max-w-screen-xl bg-white shadow-2xl  relative z-20 max-h-full min-h-0 overflow-hidden h-full lg:h-auto;
    @apply flex flex-col;
    @apply bg-black md:bg-white pointer-events-auto;
  }

  .bk-dialog-lead {
    @apply text-base md:text-lg lg:text-xl font-sans mb-10 lg:mb-20 text-mono-700;
  }
  .bk-dialog-footer {
    @apply flex gap-10 md:mt-30 p-15 lg:p-20 border-t bg-mono-50 border-t-mono-300;
    flex: 0 0 auto;
    button {
      @apply w-full lg:w-auto;
    }
  }

  .bk-dialog-content,
  .bk-dialog-pre-footer {
    @apply px-15 lg:px-20;
  }
  .bk-dialog-pre-footer {
    @apply py-15 lg:py-20 bg-mono-50 border-t border-t-mono-300;
  }

  .bk-dialog-content {
    @apply overflow-auto flex-1 min-h-0 max-h-full h-full  pt-15  lg:pt-20 lg:h-auto rounded-t-xl md:rounded-t-none bg-white;
    @apply overscroll-contain;

    &.bk-is-fullscreen {
      @apply p-0;
      .bk-dialog-content-inner {
        @apply p-0 h-full;
      }
    }
  }
  .bk-dialog-content-inner {
    min-height: calc(100vh - 160px);
    @apply pb-20;
    @variant md {
      min-height: auto;
      @apply h-auto;
    }
  }
}

.bk .bk-dialog-content-element {
  @apply rounded p-20 min-h-[400px] mb-30 border border-mono-300 flex items-center justify-center overflow-hidden;
  &.bk-default-bg {
    @apply bg-mono-50;
  }
}
</style>
