<template>
  <DialogModal
    id="translations-csv"
    :title="$t('translationsCsvDialogTitle', 'Import/Export Translations')"
    icon="bk_mdi_translate"
    :width="1800"
    hide-buttons
    @cancel="$emit('close')"
  >
    <template #tabs>
      <Tabs v-model="mode" :tabs />
    </template>
    <div class="bk h-[calc(100vh-200px)] overflow-hidden">
      <Export v-if="mode === 'export'" />
      <Import v-else :initial-files="initialFiles" @close="$emit('close')" />
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, useBlokkli } from '#imports'
import { DialogModal, Tabs } from '#blokkli/editor/components'
import Export from './Export/index.vue'
import Import from './Import/index.vue'

const props = defineProps<{
  initialFiles?: File[] | null
}>()

defineEmits<{
  close: []
}>()

const { $t } = useBlokkli()

const mode = ref<'export' | 'import'>(props.initialFiles?.length ? 'import' : 'export')

const tabs = [
  { id: 'export', label: $t('translationsCsvExport', 'Export') },
  { id: 'import', label: $t('translationsCsvImport', 'Import') },
]
</script>

<style lang="postcss">
.bk-csv-table {
  border-collapse: collapse;

  th {
    @apply text-left p-8 bg-mono-100 font-semibold text-mono-700 sticky top-0;
  }

  td {
    @apply p-8 border-t border-t-mono-200;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  tr:hover td {
    @apply bg-mono-50;
  }

  .bk-is-empty {
    @apply text-mono-400 italic;
  }
}
</style>
