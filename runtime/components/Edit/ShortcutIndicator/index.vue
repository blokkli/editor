<template>
  <kbd>
    <template v-if="meta"> <kbd>CTRL</kbd> + </template>
    <template v-if="shift"> <kbd>SHIFT</kbd> + </template>
    <kbd>{{ keyLabel }}</kbd>
  </kbd>
</template>

<script lang="ts" setup>
import { KeyPressedEvent } from '../types'

const props = defineProps<{
  meta?: boolean
  shift?: boolean
  keyLabel: string
}>()

const emit = defineEmits(['pressed'])

const { eventBus } = useParagraphsBuilderStore()

function onKeyPressed(e: KeyPressedEvent) {
  if (e.code.toLowerCase() !== props.keyLabel.toLowerCase()) {
    return
  }
  if (props.meta && !e.meta) {
    return
  }
  if (props.shift && !e.shift) {
    return
  }

  emit('pressed')
}

onMounted(() => {
  eventBus.on('keyPressed', onKeyPressed)
})

onBeforeUnmount(() => {
  eventBus.off('keyPressed', onKeyPressed)
})
</script>
