<template>
  <PanelSection :title="$t('chartsCsvFilters', 'Filters')">
    <PanelItem
      v-for="(f, fi) in modelValue"
      :key="fi"
      :title="headerCells[f.column] || `Column ${f.column + 1}`"
      :description="summariseFilterValues(f.values)"
      icon="bk_mdi_tune"
      :active="editing === fi"
      @click="toggleEdit(fi)"
    >
      <template #actions>
        <ButtonAction
          :label="$t('chartsCsvFilterRemove', 'Remove filter')"
          icon="bk_mdi_delete"
          theme="danger"
          @click.stop="remove(fi)"
        />
      </template>
      <TransitionCollapse>
        <FilterEditor
          v-if="editing === fi"
          :key="fi"
          :grid="grid"
          :header-cells="headerCells"
          :available-columns="availableColumns(fi)"
          :initial="f"
          @save="(entry) => save(fi, entry)"
          @cancel="editing = null"
        />
      </TransitionCollapse>
    </PanelItem>

    <TransitionCollapse>
      <div v-if="adding" class="border-t border-mono-300">
        <FilterEditor
          :grid="grid"
          :header-cells="headerCells"
          :available-columns="availableColumns(null)"
          :initial="null"
          @save="onAdded"
          @cancel="adding = false"
        />
      </div>
    </TransitionCollapse>

    <PanelAddButton
      v-if="!adding && availableColumns(null).length > 0"
      :label="$t('chartsCsvAddFilter', 'Add filter')"
      @click="startAdding"
    />
  </PanelSection>
</template>

<script setup lang="ts">
import { ref, useBlokkli } from '#imports'
import ButtonAction from '#blokkli/editor/components/ButtonAction/index.vue'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import PanelItem from '#blokkli/editor/components/Panel/Item/index.vue'
import PanelAddButton from '#blokkli/editor/components/Panel/AddButton/index.vue'
import TransitionCollapse from '#blokkli/editor/components/Transition/Collapse/index.vue'
import FilterEditor from '../FilterEditor/index.vue'
import type { CsvGrid, CsvImportFilter } from '../csvHelpers'

const SUMMARY_LIMIT = 3

const props = defineProps<{
  modelValue: CsvImportFilter[]
  grid: CsvGrid
  headerCells: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [CsvImportFilter[]]
}>()

const { $t } = useBlokkli()

const editing = ref<number | null>(null)
const adding = ref(false)

function availableColumns(currentIndex: number | null): number[] {
  const used = new Set(props.modelValue.map((f) => f.column))
  if (currentIndex !== null) {
    const current = props.modelValue[currentIndex]
    if (current) used.delete(current.column)
  }
  return props.headerCells.map((_, i) => i).filter((i) => !used.has(i))
}

function summariseFilterValues(values: string[]): string {
  if (values.length <= SUMMARY_LIMIT) return values.join(', ')
  const head = values.slice(0, SUMMARY_LIMIT).join(', ')
  return `${head} (+${values.length - SUMMARY_LIMIT})`
}

function toggleEdit(idx: number) {
  editing.value = editing.value === idx ? null : idx
  if (editing.value !== null) adding.value = false
}

function startAdding() {
  adding.value = true
  editing.value = null
}

function onAdded(entry: CsvImportFilter) {
  emit('update:modelValue', [...props.modelValue, entry])
  adding.value = false
}

function save(idx: number, entry: CsvImportFilter) {
  const next = [...props.modelValue]
  next[idx] = entry
  emit('update:modelValue', next)
  editing.value = null
}

function remove(idx: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== idx),
  )
  if (editing.value === idx) editing.value = null
}
</script>
