<template>
  <div class="field-value-editor">
    <RichText v-model="value" @ready="sendMessageToParent" />
  </div>
</template>

<script lang="ts" setup>
import { entityStorageManager } from '~/app/mock/entityStorage'
import { getEditState } from '~/app/mock/state'
import type { FieldTextarea } from '~/app/mock/state/Field/Textarea'
import RichText from '~/components/EntityForm/RichText/index.vue'

definePageMeta({
  layout: 'form',
})

const entityType = useParamString('entityType')
const entityUuid = useParamString('entityUuid')
const uuid = useQueryString('uuid')
const fieldName = useQueryString('fieldName')
const page = entityStorageManager.getContent(entityUuid.value)

const editState = getEditState(entityType.value, entityUuid.value)
const mutatedState = editState.getMutatedState(page)

const block = mutatedState.context.getProxy(uuid.value)?.block

if (!block) {
  throw new Error('Block with this UUID does not exist.')
}

const field = block.get<FieldTextarea>(fieldName.value)

const value = ref(field.getText())

const getHeight = () => {
  const editor = document.querySelector('.ck-editor')
  if (editor instanceof HTMLElement) {
    const rect = editor.getBoundingClientRect()
    return rect.height
  }

  return 200
}

const sendMessageToParent = () => {
  if (window.parent !== window) {
    window.parent.postMessage({
      name: 'blokkli__' + 'editable_field_update',
      data: {
        text: value.value,
        height: getHeight(),
      },
    })
  }
}

const onWheel = (e: WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault()
  }
}

watch(value, () => {
  sendMessageToParent()
})

onMounted(() => {
  sendMessageToParent()
  document.body.addEventListener('wheel', onWheel, { passive: false })
  document.documentElement.classList.add('allow-overscroll')
})

onBeforeUnmount(() => {
  document.body.removeEventListener('wheel', onWheel)
})
</script>

<style lang="postcss">
.field-value-editor .ck-editor {
  @apply overscroll-contain;
  .ck-editor__editable_inline {
    @apply min-h-[200px] max-h-[500px];
  }
}
</style>
