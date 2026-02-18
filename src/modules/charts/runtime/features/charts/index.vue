<template>
  <NestedEditorOverlay
    v-if="uuid"
    :uuid
    :title="$t('chartsEditorTitle', 'Edit chart')"
    icon="bk_mdi_area_chart"
    theme="accent"
    :element
    @submit="onSubmit"
    @close="onSubmit"
  >
    <ChartsEditor ref="editorRef" :uuid />
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
import ChartsEditor from './Editor/index.vue'

defineBlokkliFeature({
  id: 'charts',
  icon: 'bk_mdi_area_chart',
  label: 'Charts',
  description: 'Add and edit interactive charts.',
  requiredAdapterMethods: ['updateOptions'],
})

const { $t, state, adapter, dom, blocks } = useBlokkli()

const uuid = ref<string | null>(null)
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
const isLoading = ref(false)
const editorRef = useTemplateRef('editorRef')

async function onSubmit() {
  if (!uuid.value || !editorRef.value) return
  const chartData = editorRef.value.getData()
  isLoading.value = true
  await state.mutateWithLoadingState(
    () =>
      adapter.updateOptions!([
        {
          uuid: uuid.value!,
          key: 'data',
          value: JSON.stringify(chartData),
        },
      ]),
    $t('chartsEditorSaveError', 'The chart could not be saved.'),
  )
  isLoading.value = false
  uuid.value = null
}

onBlokkliEvent('fragment:edit', (data) => {
  if (data.name === 'blokkli_chart') {
    uuid.value = data.uuid
  } else {
    uuid.value = null
  }
})
</script>
