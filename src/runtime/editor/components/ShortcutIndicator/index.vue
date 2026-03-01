<template>
  <kbd :title="label" class="bk-shortcut">
    <template v-if="meta"> <kbd>CTRL</kbd> + </template>
    <template v-if="shift"> <kbd>SHIFT</kbd> + </template>
    <kbd
      :class="{
        'bk-is-single': keyLabel.length === 1,
      }"
      >{{ keyLabel }}</kbd
    >
  </kbd>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { defineShortcut, onBlokkliEvent } from '#blokkli/editor/composables'

const props = defineProps<{
  group?: string
  viewOnly?: boolean
  meta?: boolean
  shift?: boolean
  keyCode: string
  label?: string
}>()

const emit = defineEmits(['pressed'])

const { state, ui, $t } = useBlokkli()

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
  } else if (props.keyCode === 'ArrowRight') {
    return '→'
  } else if (props.keyCode === 'ArrowLeft') {
    return '←'
  } else if (props.keyCode === 'Digit0' || props.keyCode === '0') {
    return ''
  } else if (props.keyCode === ' ') {
    return $t('keyboardSpace', 'Space')
  }

  return props.keyCode.toUpperCase()
})

if (!props.viewOnly) {
  if (props.label) {
    defineShortcut({
      meta: props.meta,
      shift: props.shift,
      code: props.keyCode,
      label: props.label,
      group: props.group,
    })
  }

  onBlokkliEvent('keyPressed', (e) => {
    if (ui.hasDialogOpen.value || ui.hasNestedEditorOpen.value) {
      return
    }
    const checkKey = [e.meta, e.shift, e.code.toLowerCase()].join('-')
    if (key.value !== checkKey) {
      return
    }

    e.originalEvent.preventDefault()

    if (state.isLoading.value || ui.hasTransformOverlayOpen.value) {
      return
    }
    emit('pressed')
  })
}
</script>

<script lang="ts">
export default {
  name: 'ShortcutIndicator',
}
</script>
