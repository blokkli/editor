<template>
  <input
    ref="fileInputEl"
    type="file"
    accept=".csv,text/csv"
    class="bk-chart-data-table-file-input"
    @change="onFileChange"
  />
  <PanelAction
    :title="$t('chartsImportCsv', 'Import CSV')"
    icon="bk_mdi_csv"
    @click="fileInputEl?.click()"
  />
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <PreviewDialog
        v-if="grid && showDialog"
        :grid="grid"
        @submit="onDialogSubmit"
        @cancel="grid = null"
      />
    </BlokkliTransition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, useBlokkli } from '#imports'
import { BlokkliTransition } from '#blokkli/editor/components'
import PanelAction from '#blokkli/editor/components/Panel/Action/index.vue'
import PreviewDialog from './PreviewDialog.vue'
import { type CsvGrid, type CsvImportPayload, parseCsvText } from './csvHelpers'
import { useDialog } from '#blokkli/editor/composables'

const emit = defineEmits<{
  import: [payload: CsvImportPayload]
}>()

const { $t, ui } = useBlokkli()
const fileInputEl = useTemplateRef<HTMLInputElement>('fileInputEl')

const grid = ref<CsvGrid | null>(null)
const showDialog = useDialog('charts-csv-preview', 'center')

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Reset so the same file can be re-selected.
  input.value = ''
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result
    if (typeof text !== 'string') return
    const parsed = parseCsvText(text)
    if (parsed.length === 0) return
    grid.value = parsed
    showDialog.value = true
  }
  reader.readAsText(file)
}

function onDialogSubmit(payload: CsvImportPayload) {
  emit('import', payload)
  grid.value = null
  showDialog.value = false
}
</script>
