<template>
  <div
    class="bk-dialog bk-control"
    @wheel.stop
    @keydown.stop
    @touchstart.stop
    @touchmove.stop
    @touchend.stop
  >
    <div class="bk-dialog-background" @click="$emit('cancel')" />
    <div class="bk-dialog-inner" :style="style">
      <div class="bk bk-dialog-header">
        <Icon v-if="icon" :name="icon" />
        <h3>{{ title }}</h3>
        <button @click="$emit('cancel')">
          <Icon name="close" />
        </button>
      </div>

      <div class="bk-dialog-content">
        <div class="bk-dialog-content-inner">
          <div v-if="lead" class="bk bk-dialog-lead">
            {{ lead }}
          </div>
          <slot />
        </div>
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
import { useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import type { BlokkliIcon } from '#blokkli/icons'
import type { KeyPressedEvent } from '#blokkli/types'
import { Icon } from '#blokkli/components'

const { eventBus, ui } = useBlokkli()

const emit = defineEmits(['submit', 'cancel'])

const props = withDefaults(
  defineProps<{
    title: string
    lead?: string
    width?: number
    submitLabel?: string
    canSubmit?: boolean
    isDanger?: boolean
    isLoading?: boolean
    hideButtons?: boolean
    icon?: BlokkliIcon
  }>(),
  {
    width: 600,
    canSubmit: true,
    lead: '',
    submitLabel: '',
    icon: undefined,
  },
)

const style = computed(() => {
  if (ui.isMobile.value) {
    return {}
  }

  return {
    width: props.width + 'px',
  }
})

const onKeyPressed = (e: KeyPressedEvent) => {
  if (e.code === 'Escape') {
    emit('cancel')
  }
}

onMounted(() => {
  eventBus.on('keyPressed', onKeyPressed)
})

onBeforeUnmount(() => {
  eventBus.off('keyPressed', onKeyPressed)
})
</script>
