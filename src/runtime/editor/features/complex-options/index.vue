<template>
  <NestedEditorOverlay
    v-if="uuid"
    :uuid
    :title="$t(config!.editorTitle)"
    :icon="config!.editorIcon"
    theme="accent"
    :element
    @submit="onSubmit"
    @close="onSubmit"
  >
    <component
      :is="config!.editorComponent"
      ref="editorRef"
      :data
      :uuid
      :option-key="optionKey"
    />
  </NestedEditorOverlay>
</template>

<script setup lang="ts">
import { onBlokkliEvent } from '#blokkli/editor/composables'
import {
  defineBlokkliFeature,
  ref,
  useTemplateRef,
  useBlokkli,
  computed,
} from '#imports'
import { NestedEditorOverlay } from '#blokkli/editor/components'
import { COMPLEX_OPTION_TYPES } from '#blokkli-build/complex-option-types'

defineBlokkliFeature({
  id: 'complex-options',
  icon: 'bk_mdi_edit',
  label: 'Complex Options',
  description: 'Edit complex option types such as charts.',
  requiredAdapterMethods: ['updateOptions'],
})

const { $t, state, adapter, dom, blocks } = useBlokkli()

const uuid = ref<string | null>(null)
const optionKey = ref('')
const dataType = ref('')

const config = computed(() => {
  if (!dataType.value) {
    return null
  }
  return COMPLEX_OPTION_TYPES[
    dataType.value as keyof typeof COMPLEX_OPTION_TYPES
  ]
})

const element = computed(() => {
  if (!uuid.value) {
    return null
  }
  const block = blocks.getBlock(uuid.value)
  if (!block) {
    return null
  }
  return dom.getDragElement(block)
})

const data = computed(() => {
  if (!uuid.value || !optionKey.value) {
    return null
  }
  const rawData =
    state.mutatedOptions[uuid.value]?.[optionKey.value] ||
    state.getFieldListItem(uuid.value)?.options?.[optionKey.value]
  if (rawData) {
    try {
      return JSON.parse(rawData)
    } catch {
      return null
    }
  }
  return null
})

const editorRef = useTemplateRef('editorRef')

async function onSubmit() {
  if (!uuid.value || !editorRef.value) return
  const editorData = (editorRef.value as any).getData()
  await state.mutateWithLoadingState(
    () =>
      adapter.updateOptions!([
        {
          uuid: uuid.value!,
          key: optionKey.value,
          value: JSON.stringify(editorData),
        },
      ]),
    $t('complexOptionsSaveError', 'The data could not be saved.'),
  )
  uuid.value = null
}

onBlokkliEvent('option:edit-complex', (e) => {
  if (!(e.dataType in COMPLEX_OPTION_TYPES)) {
    return
  }
  uuid.value = e.uuid
  optionKey.value = e.key
  dataType.value = e.dataType
})
</script>
