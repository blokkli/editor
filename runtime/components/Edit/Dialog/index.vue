<template>
  <div class="pb-dialog pb-control" @wheel.stop @keydown.stop>
    <div @click="$emit('cancel')" class="pb-dialog-background pb-overlay"></div>
    <div class="pb-dialog-inner" :style="{ width: width + 'px' }">
      <div class="pb pb-dialog-header">
        <h3>{{ title }}</h3>
        <button @click="$emit('cancel')">
          <Icon name="close" />
        </button>
      </div>
      <div class="pb pb-dialog-lead" v-if="lead">{{ lead }}</div>
      <div class="pb-dialog-content">
        <slot></slot>
      </div>
      <div class="pb pb-dialog-footer" v-if="!hideButtons">
        <button
          @click="$emit('submit')"
          class="pb-button"
          :disabled="!canSubmit"
          :class="[
            { 'pb-is-loading': isLoading },
            isDanger ? 'pb-is-danger' : 'pb-is-primary',
          ]"
        >
          {{ submitLabel }}
        </button>
        <button @click="$emit('cancel')" class="pb-button">Abbrechen</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { KeyPressedEvent } from '#pb/types'
import { Icon } from '#pb/components'

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
  },
)

const { eventBus } = useBlokkli()

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
