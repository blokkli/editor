<template>
  <div class="bk bk-editable-field-textarea">
    <textarea
      ref="input"
      :value="modelValue"
      enterkeyhint="done"
      rows="2"
      :style="inputStyle"
      v-bind="inputAttributes"
      @keydown.stop.capture="onKeyDown"
      @blur="onBlur"
      @input="
        $emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
    />
    <div :style="inputStyle" class="bk-textarea" v-html="modelValue" />
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'

const { ui, selection } = useBlokkli()

const props = defineProps<{
  element: HTMLElement
  required: boolean
  maxlength?: number
  modelValue: string
}>()

const emit = defineEmits(['close', 'save', 'update:modelValue'])

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
  if (props.maxlength) {
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

const inputStyle = computed<Record<string, any>>(() => {
  const computedStyle = window.getComputedStyle(props.element)
  return {
    textAlign: computedStyle.textAlign,
  }
})
</script>
