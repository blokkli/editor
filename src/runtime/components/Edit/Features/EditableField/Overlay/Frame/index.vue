<template>
  <div class="bk-editable-field-frame">
    <iframe ref="iframe" :style="{ height: height + 'px' }" :src="url" />
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli, ref, computed, onMounted, onBeforeUnmount } from '#imports'
import type { EditableType } from '#blokkli/types'

const { adapter } = useBlokkli()

const props = defineProps<{
  modelValue: string
  type: EditableType
  fieldName: string
  uuid: string
  initialHeight: number
}>()

const height = ref(props.initialHeight)

const url = computed(() => {
  return adapter.buildEditableFrameUrl!({
    uuid: props.uuid,
    fieldName: props.fieldName,
  })
})

const original = ref('')

const emit = defineEmits(['update:modelValue', 'close'])

const onMessage = (e: MessageEvent) => {
  if (typeof e.data === 'object') {
    if (e.data.name === 'blokkli__editable_field_update') {
      emit('update:modelValue', e.data.data.text)
    } else if (e.data.name === 'blokkli__editable_field_update_height') {
      height.value = e.data.data.height
    }
  }
}

onMounted(() => {
  original.value = props.modelValue
  height.value = props.initialHeight + 48

  window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
})
</script>
