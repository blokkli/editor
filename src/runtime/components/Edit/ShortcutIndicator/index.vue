<template>
  <kbd :title="label" class="bk-shortcut">
    <template v-if="meta"> <kbd>CTRL</kbd> + </template>
    <template v-if="shift"> <kbd>SHIFT</kbd> + </template>
    <kbd>{{ keyLabel }}</kbd>
  </kbd>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const props = defineProps<{
  group?: string
  viewOnly?: boolean
  meta?: boolean
  shift?: boolean
  keyCode: string
  label: string
}>()

const emit = defineEmits(['pressed'])

const { state, keyboard } = useBlokkli()

const key = computed(() =>
  [props.meta, props.shift, props.keyCode.toLowerCase()].join('-'),
)

const keyLabel = computed(() => {
  if (props.keyCode === 'Delete') {
    return '⌫'
  } else if (props.keyCode === 'ArrowDown') {
    return '↓'
  } else if (props.keyCode === 'ArrowUp') {
    return '↑'
  } else if (props.keyCode === 'Digit0' || props.keyCode === '0') {
    return ''
  }

  return props.keyCode.toUpperCase()
})

const shortcut = computed(() => {
  return {
    meta: props.meta,
    shift: props.shift,
    code: props.keyCode,
    label: props.label,
    group: props.group,
  }
})

onBlokkliEvent('keyPressed', (e) => {
  const checkKey = [e.meta, e.shift, e.code.toLowerCase()].join('-')
  if (key.value !== checkKey) {
    return
  }

  e.originalEvent.preventDefault()

  if (state.isLoading.value) {
    return
  }
  emit('pressed')
})

onMounted(() => {
  if (props.viewOnly) {
    return
  }

  keyboard.registerShortcut(shortcut.value)
})

onBeforeUnmount(() => {
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
