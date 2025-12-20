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
      v-model="modelValue"
      enterkeyhint="done"
      rows="2"
      v-bind="inputAttributes"
      @keydown.capture="onKeyDown"
      @blur="onBlur"
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
}>()

const modelValue = defineModel<string>({ required: true })

const emit = defineEmits(['discard', 'save'])

const input = useTemplateRef('input')

const height = ref(20)

function discard() {
  emit('discard')
}

function save() {
  if (props.required && !modelValue.value) {
    return
  }
  emit('save')
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Escape') {
    e.preventDefault()
    discard()
  } else if (e.code === 'Enter') {
    e.preventDefault()
    save()
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
    save()
  }, 100)
}

onBlokkliEvent('animationFrame', () => {
  height.value = Math.max(input.value?.scrollHeight ?? 20, 20)
})
</script>
