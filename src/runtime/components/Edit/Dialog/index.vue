<template>
  <div class="bk-dialog bk-control" @wheel.stop @keydown.stop>
    <div class="bk-dialog-background bk-overlay" @click="$emit('cancel')" />
    <div class="bk-dialog-inner" :style="{ width: width + 'px' }">
      <div class="bk bk-dialog-header">
        <h3>{{ title }}</h3>
        <button @click="$emit('cancel')">
          <Icon name="close" />
        </button>
      </div>
      <div v-if="lead" class="bk bk-dialog-lead">
        {{ lead }}
      </div>
      <div class="bk-dialog-content">
        <slot />
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
        <button class="bk-button" @click="$emit('cancel')">
          {{ text('cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { KeyPressedEvent } from '#blokkli/types'
import { Icon } from '#blokkli/components'

const emit = defineEmits(['submit', 'cancel'])

withDefaults(
  defineProps<{
    title: string
    lead?: string
    width?: number
    submitLabel?: string
    canSubmit?: boolean
    isDanger?: boolean
    isLoading?: boolean
    hideButtons?: boolean
  }>(),
  {
    width: 600,
    canSubmit: true,
    lead: '',
    submitLabel: '',
  },
)

const { eventBus, text } = useBlokkli()

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
