<template>
  <FlexTextarea
    id="bk-editable-field-textarea"
    ref="textarea"
    v-model="modelValue"
    class="bk bk-editable-field-textarea"
    enterkeyhint="done"
    submit-on-enter
    rows="2"
    v-bind="inputAttributes"
    autofocus
    @keydown="onKeyDown"
    @blur="onBlur"
    @submit="save"
  />
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import { FlexTextarea } from '#blokkli/editor/components'

const { ui, selection } = useBlokkli()

const props = defineProps<{
  element: HTMLElement
  required: boolean
  maxlength?: number
}>()

const modelValue = defineModel<string>({ required: true })

const emit = defineEmits(['discard', 'save'])

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
  e.stopPropagation()
  if (e.code === 'Escape') {
    e.preventDefault()
    discard()
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
    if (!selection.activeEditableLabel.value) {
      return
    }
    save()
  }, 100)
}
</script>
