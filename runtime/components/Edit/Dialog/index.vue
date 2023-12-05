<template>
  <div class="bk-dialog bk-control" @wheel.stop @keydown.stop>
    <div @click="$emit('cancel')" class="bk-dialog-background bk-overlay"></div>
    <div class="bk-dialog-inner" :style="{ width: width + 'px' }">
      <div class="bk bk-dialog-header">
        <h3>{{ title }}</h3>
        <button @click="$emit('cancel')">
          <Icon name="close" />
        </button>
      </div>
      <div class="bk bk-dialog-lead" v-if="lead">{{ lead }}</div>
      <div class="bk-dialog-content">
        <slot></slot>
      </div>
      <div class="bk bk-dialog-footer" v-if="!hideButtons">
        <button
          @click="$emit('submit')"
          class="bk-button"
          :disabled="!canSubmit"
          :class="[
            { 'bk-is-loading': isLoading },
            isDanger ? 'bk-is-danger' : 'bk-is-primary',
          ]"
        >
          {{ submitLabel }}
        </button>
        <button @click="$emit('cancel')" class="bk-button">Abbrechen</button>
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
