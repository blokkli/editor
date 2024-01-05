<template>
  <kbd :title="label" class="bk-shortcut">
    <template v-if="meta"> <kbd>CTRL</kbd> + </template>
    <template v-if="shift"> <kbd>SHIFT</kbd> + </template>
    <kbd>{{ keyLabel }}</kbd>
  </kbd>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import type { KeyPressedEvent } from '#blokkli/types'

const props = defineProps<{
  group?: string
  viewOnly?: boolean
  meta?: boolean
  shift?: boolean
  keyCode: string
  label: string
}>()

const emit = defineEmits(['pressed'])

const { eventBus, state, keyboard } = useBlokkli()

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

const shortcut = computed(() => {
  return {
    meta: props.meta,
    shift: props.shift,
    code: props.keyCode,
    label: props.label,
    group: props.group,
  }
})

onMounted(() => {
  if (props.viewOnly) {
    return
  }
  eventBus.on('keyPressed', onKeyPressed)

  keyboard.registerShortcut(shortcut.value)
})

onBeforeUnmount(() => {
  eventBus.off('keyPressed', onKeyPressed)
  if (props.viewOnly) {
    return
  }
  keyboard.unregisterShortcut(shortcut.value)
})
</script>

<script lang="ts">
export default {
  name: 'ShortcutIndicator',
}
</script>
