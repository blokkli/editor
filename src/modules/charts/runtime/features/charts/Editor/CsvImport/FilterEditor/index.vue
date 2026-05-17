<template>
  <div class="p-15">
    <FormItem>
      <FormSelect
        id="charts-csv-filter-column"
        v-model="columnStr"
        :label="$t('chartsCsvFilterColumn', 'Column')"
        :options="columnOptions"
      />
      <div v-if="column !== null" class="mt-20">
        <FormCheckboxes
          id="charts-csv-filter-values"
          v-model="values"
          :label="$t('chartsCsvFilterValues', 'Allowed values')"
          :options="valueOptions"
        />
      </div>
    </FormItem>
    <FormItem class="flex gap-5">
      <button
        type="button"
        class="bk-button bk-scheme-accent bk-is-small"
        :disabled="!canSave"
        @click="onSave"
      >
        {{ $t('chartsCsvFilterSave', 'Save filter') }}
      </button>
      <button
        type="button"
        class="bk-button bk-is-light bk-is-small"
        @click="$emit('cancel')"
      >
        {{ $t('cancel', 'Cancel') }}
      </button>
    </FormItem>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useBlokkli } from '#imports'
import {
  FormSelect,
  FormCheckboxes,
  FormItem,
} from '#blokkli/editor/components'
import type { CsvGrid, CsvImportFilter } from '../csvHelpers'
import { columnLabelWithSample, distinctColumnValues } from '../csvHelpers'

const props = defineProps<{
  grid: CsvGrid
  headerCells: string[]
  availableColumns: number[]
  initial: CsvImportFilter | null
}>()

const emit = defineEmits<{
  save: [CsvImportFilter]
  cancel: []
}>()

const { $t } = useBlokkli()

const column = ref<number | null>(props.initial?.column ?? null)
const values = ref<string[]>(props.initial ? [...props.initial.values] : [])

const columnStr = computed<string>({
  get() {
    return column.value === null ? '' : String(column.value)
  },
  set(v: string) {
    const next = v === '' ? null : Number(v)
    if (next !== column.value) {
      column.value = next
      values.value = []
    }
  },
})

const columnOptions = computed(() => [
  { value: '', label: $t('pickColumn', 'Pick a column…') },
  ...props.availableColumns.map((i) => ({
    value: String(i),
    label: columnLabelWithSample(props.grid, i),
  })),
])

const valueOptions = computed(() => {
  if (column.value === null) return []
  return distinctColumnValues(props.grid, column.value).map((v) => ({
    value: v,
    label: v,
  }))
})

const canSave = computed(() => column.value !== null && values.value.length > 0)

function onSave() {
  if (!canSave.value || column.value === null) return
  emit('save', { column: column.value, values: [...values.value] })
}
</script>
