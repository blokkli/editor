<template>
  <kbd>
    <template v-if="meta"> <kbd>CTRL</kbd> + </template>
    <template v-if="shift"> <kbd>SHIFT</kbd> + </template>
    <kbd>{{ keyLabel }}</kbd>
  </kbd>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import type { KeyPressedEvent } from '#blokkli/types'

const props = defineProps<{
  meta?: boolean
  shift?: boolean
  keyCode: string
}>()

const emit = defineEmits(['pressed'])

const { eventBus, state } = useBlokkli()

const key = computed(() =>
  [props.meta, props.shift, props.keyCode.toLowerCase()].join('-'),
)

const keyLabel = computed(() => {
  if (props.keyCode === 'Delete') {
    return 'DEL'
  }

  return props.keyCode.toUpperCase()
})

function onKeyPressed(e: KeyPressedEvent) {
  const checkKey = [e.meta, e.shift, e.code.toLowerCase()].join('-')
  if (key.value !== checkKey) {
    return
  }

  e.originalEvent.preventDefault()

  if (state.isLoading.value) {
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
