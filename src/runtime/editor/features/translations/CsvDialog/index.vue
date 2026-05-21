<template>
  <DialogModal
    id="translations-csv"
    :title="$t('translationsCsvDialogTitle', 'Import/Export Translations')"
    icon="bk_mdi_translate"
    :width="1800"
    mono
    hide-buttons
    @cancel="$emit('close')"
  >
    <template #tabs>
      <Tabs v-model="mode" :tabs mono />
    </template>
    <Export v-if="mode === 'export'" />
    <Import v-else :initial-files="initialFiles" @close="$emit('close')" />
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

const mode = ref<'export' | 'import'>(
  props.initialFiles?.length ? 'import' : 'export',
)

const tabs = [
  { id: 'export', label: $t('translationsCsvExport', 'Export') },
  { id: 'import', label: $t('translationsCsvImport', 'Import') },
]
</script>
