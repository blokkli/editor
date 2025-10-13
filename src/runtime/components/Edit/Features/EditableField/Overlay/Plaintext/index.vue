<template>
  <div
    class="bk bk-editable-field-textarea"
    :style="{
      height: height + 'px',
    }"
  >
    <textarea
      id="bk-editable-field-textarea"
      ref="input"
      :value="modelValue"
      enterkeyhint="done"
      rows="2"
      v-bind="inputAttributes"
      @keydown.stop.capture="onKeyDown"
      @blur="onBlur"
      @input="
        $emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
    />
  </div>
</template>

<script lang="ts" setup>
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import { useBlokkli, computed, useTemplateRef, ref } from '#imports'

const { ui, selection } = useBlokkli()

const props = defineProps<{
  element: HTMLElement
  required: boolean
  maxlength?: number
  modelValue: string
}>()

const emit = defineEmits(['close', 'save', 'update:modelValue'])

const input = useTemplateRef('input')

const height = ref(20)

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    e.preventDefault()
    emit('close')
  } else if (e.code === 'Enter') {
    e.preventDefault()
    emit('save')
  }
}

const inputAttributes = computed(() => {
  const attrs: Record<string, any> = {}
  if (props.required) {
    attrs.required = true
  }
  if (props.maxlength && props.maxlength >= 1) {
    attrs.maxlength = props.maxlength
  }
  return attrs
})

let blurTimeout: any = null

const onBlur = (e: FocusEvent) => {
  clearTimeout(blurTimeout)

  if (!ui.isMobile.value) {
    return
  }

  e.stopPropagation()
  e.preventDefault()

  blurTimeout = setTimeout(() => {
    if (!selection.editableActive.value) {
      return
    }
    emit('save')
  }, 100)
}

onBlokkliEvent('animationFrame', () => {
  height.value = Math.max(input.value?.scrollHeight ?? 20, 20)
})
</script>
