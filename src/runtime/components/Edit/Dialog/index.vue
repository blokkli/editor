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
          <Icon name="close" />
        </button>
      </div>

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
      <div v-if="!hideButtons" class="bk bk-dialog-footer">
        <button
          class="bk-button"
          :disabled="!canSubmit"
          :class="[
            { 'bk-is-loading': isLoading },
            isDanger ? 'bk-is-danger' : 'bk-is-primary',
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
import { Icon } from '#blokkli/components'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import useFocusTrap from '#blokkli/helpers/composables/useFocusTrap'

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
