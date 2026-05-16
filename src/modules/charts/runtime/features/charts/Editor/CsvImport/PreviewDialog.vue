<template>
  <DialogModal
    id="charts-csv-preview"
    :title="$t('chartsCsvPreviewTitle', 'Preview CSV import')"
    :lead="
      $t(
        'chartsCsvPreviewLead',
        'Adjust the column mapping if needed; the preview below shows exactly what will be imported.',
      )
    "
    :width="1200"
    icon="bk_mdi_csv"
    :submit-label="$t('chartsCsvPreviewSubmit', 'Import')"
    :can-submit="canSubmit"
    z-index="high"
    mono
    @submit="onSubmit"
    @cancel="$emit('cancel')"
  >
    <PanelSection :title="$t('chartsCsvLayout', 'Layout')" padded>
      <FormItem>
        <FormToggle
          v-model="transpose"
          :label="$t('chartsCsvTranspose', 'Transpose (swap rows and columns)')"
          :description="
            $t(
              'chartsCsvTransposeDescription',
              'Use this when the CSV has the categories along the top row instead of the first column.',
            )
          "
        />
        <div class="mt-15">
          <FormToggle
            v-model="reverseRows"
            :label="$t('chartsCsvReverseRows', 'Reverse row order')"
          />
        </div>
      </FormItem>
      <FormItem>
        <FormSelect
          id="charts-csv-sort"
          v-model="sort"
          :label="$t('chartsCsvSort', 'Sort categories')"
          :options="sortOptions"
        />
      </FormItem>
    </PanelSection>

    <PanelSection :title="$t('chartsCsvData', 'Data')" padded>
      <FormItem v-if="hasEnoughData">
        <FormSelect
          id="charts-csv-category"
          v-model="categoryColumnStr"
          :label="$t('chartsCsvCategoryColumn', 'Category column')"
          :description="
            $t(
              'chartsCsvCategoryColumnDescription',
              'Distinct values in this column become the categories of the chart.',
            )
          "
          :options="categoryColumnOptions"
        />
      </FormItem>
      <FormItem v-if="hasEnoughData && valueOptions.length > 0">
        <FormCheckboxes
          id="charts-csv-values"
          v-model="valueColumnsStr"
          :label="$t('chartsCsvValueColumns', 'Value columns')"
          :description="
            $t(
              'chartsCsvValueColumnsDescription',
              'Numeric columns to import. Pick multiple to use each as its own series. Pick one to split rows into series via Group by.',
            )
          "
          :options="valueOptions"
        />
      </FormItem>
    </PanelSection>

    <GroupBySection
      v-if="hasEnoughData && valueColumns.length === 1"
      v-model="groupByColumns"
      :grid="orientedGrid"
      :header-cells="headerCells"
      :available-columns="availableGroupByColumns"
    />

    <FiltersSection
      v-model="filters"
      :grid="orientedGrid"
      :header-cells="headerCells"
    />

    <PanelSection :title="$t('chartsCsvOutputPreview', 'Output preview')">
      <div v-if="!hasEnoughData" class="p-15">
        <InfoBox
          small
          :text="
            $t(
              'chartsCsvInvalidFile',
              'The CSV file does not contain enough data to import.',
            )
          "
        />
      </div>
      <div v-else-if="submitError" class="p-15">
        <InfoBox small :text="submitError" />
      </div>
      <OutputPreviewTable
        v-else
        :payload="orderedPayload"
        @move="onSeriesMove"
      />
    </PanelSection>
  </DialogModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, useBlokkli } from '#imports'
import {
  DialogModal,
  FormToggle,
  FormSelect,
  FormCheckboxes,
  InfoBox,
  FormItem,
} from '#blokkli/editor/components'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import {
  type CategorySort,
  type CsvGrid,
  type CsvImportConfig,
  type CsvImportFilter,
  type CsvImportPayload,
  type ColumnRole,
  columnLabelWithSample,
  gridToImportPayload,
  inferSmartConfig,
  reverseRowsKeepingHeader,
  transposeGrid,
} from './csvHelpers'
import GroupBySection from './GroupBySection/index.vue'
import FiltersSection from './FiltersSection/index.vue'
import OutputPreviewTable from './OutputPreviewTable/index.vue'

const props = defineProps<{
  grid: CsvGrid
  fileName: string
}>()

const emit = defineEmits<{
  submit: [payload: CsvImportPayload]
  cancel: []
}>()

const { $t, config, storage } = useBlokkli()

type SavedImportConfig = {
  transpose: boolean
  reverseRows: boolean
  sort: CategorySort
  categoryColumn: number
  valueColumns: number[]
  groupByColumns: number[]
  filters: CsvImportFilter[]
  seriesOrder: string[]
}

const savedConfig = storage.use<SavedImportConfig | null>(
  computed(() => `charts:csvImport:${props.fileName}`),
  null,
)

const initial = savedConfig.value

const transpose = ref(initial?.transpose ?? false)
const reverseRows = ref(initial?.reverseRows ?? false)
const sort = ref<CategorySort>(initial?.sort ?? 'firstOccurrence')

const orientedGrid = computed<CsvGrid>(() => {
  let grid = props.grid
  if (transpose.value) grid = transposeGrid(grid)
  if (reverseRows.value) grid = reverseRowsKeepingHeader(grid)
  return grid
})

const headerCells = computed<string[]>(() => orientedGrid.value[0] ?? [])

const hasEnoughData = computed(
  () => orientedGrid.value.length >= 2 && headerCells.value.length > 0,
)

const categoryColumn = ref<number>(initial?.categoryColumn ?? 0)
const valueColumns = ref<number[]>(initial?.valueColumns ?? [])
const groupByColumns = ref<number[]>(initial?.groupByColumns ?? [])
const filters = ref<CsvImportFilter[]>(initial?.filters ?? [])

// Only run smart inference when there's no saved config for this file. If a
// saved config exists the user already curated it; re-inferring on every
// orientation change would clobber their choices.
if (!initial) {
  watch(
    orientedGrid,
    (g) => {
      const inferred = inferSmartConfig(g)
      categoryColumn.value = inferred.category
      valueColumns.value = inferred.values
      groupByColumns.value = inferred.groupBy
      filters.value = inferred.filters
    },
    { immediate: true },
  )
}

// Strip stale role assignments when category or value selection changes.
watch(categoryColumn, (cat) => {
  if (valueColumns.value.includes(cat)) {
    valueColumns.value = valueColumns.value.filter((c) => c !== cat)
  }
  if (groupByColumns.value.includes(cat)) {
    groupByColumns.value = groupByColumns.value.filter((c) => c !== cat)
  }
})

watch(valueColumns, (cols) => {
  if (cols.length !== 1) {
    if (groupByColumns.value.length > 0) groupByColumns.value = []
    return
  }
  const vc = cols[0]!
  if (groupByColumns.value.includes(vc)) {
    groupByColumns.value = groupByColumns.value.filter((c) => c !== vc)
  }
})

const categoryColumnStr = computed<string>({
  get() {
    return String(categoryColumn.value)
  },
  set(v) {
    const n = Number(v)
    if (Number.isFinite(n)) categoryColumn.value = n
  },
})

const categoryColumnOptions = computed(() =>
  headerCells.value.map((_name, i) => ({
    value: String(i),
    label: columnLabelWithSample(orientedGrid.value, i),
  })),
)

const valueColumnsStr = computed<string[]>({
  get() {
    return valueColumns.value.map(String)
  },
  set(v) {
    valueColumns.value = v
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n))
  },
})

const valueOptions = computed(() =>
  headerCells.value
    .map((_name, i) => i)
    .filter((i) => i !== categoryColumn.value)
    .map((i) => ({
      value: String(i),
      label: columnLabelWithSample(orientedGrid.value, i),
    })),
)

const availableGroupByColumns = computed<number[]>(() => {
  const used = new Set<number>([
    categoryColumn.value,
    ...valueColumns.value,
    ...groupByColumns.value,
  ])
  return headerCells.value.map((_, i) => i).filter((i) => !used.has(i))
})

const sortOptions = computed(() => [
  {
    value: 'firstOccurrence',
    label: $t('chartsCsvSortFirstOccurrence', 'First occurrence'),
  },
  {
    value: 'alphabetical',
    label: $t('chartsCsvSortAlphabetical', 'Alphabetical'),
  },
  { value: 'numeric', label: $t('chartsCsvSortNumeric', 'Numeric') },
])

const roles = computed<ColumnRole[]>(() => {
  const out: ColumnRole[] = headerCells.value.map(() => 'ignore')
  if (categoryColumn.value >= 0 && categoryColumn.value < out.length) {
    out[categoryColumn.value] = 'category'
  }
  if (valueColumns.value.length === 1) {
    const vc = valueColumns.value[0]!
    if (vc < out.length && out[vc] === 'ignore') out[vc] = 'value'
    for (const gb of groupByColumns.value) {
      if (gb < out.length && out[gb] === 'ignore') out[gb] = 'groupBy'
    }
  } else {
    for (const v of valueColumns.value) {
      if (v < out.length && out[v] === 'ignore') out[v] = 'series'
    }
  }
  return out
})

const importConfig = computed<CsvImportConfig>(() => ({
  roles: roles.value,
  filters: filters.value,
  sort: sort.value,
  groupBySeparator: ' · ',
}))

const outputPayload = computed<CsvImportPayload>(() =>
  gridToImportPayload(
    orientedGrid.value,
    importConfig.value,
    config.colorOptions.value,
  ),
)

// User-driven series order by name. Series not listed here render after the
// listed ones in their natural pivot order, so config changes that introduce
// new series don't strand them.
const seriesOrder = ref<string[]>(initial?.seriesOrder ?? [])

const orderedPayload = computed<CsvImportPayload>(() => {
  const remaining = new Map(outputPayload.value.series.map((s) => [s.name, s]))
  const reordered: typeof outputPayload.value.series = []
  for (const name of seriesOrder.value) {
    const s = remaining.get(name)
    if (s) {
      reordered.push(s)
      remaining.delete(name)
    }
  }
  for (const s of outputPayload.value.series) {
    if (remaining.has(s.name)) reordered.push(s)
  }
  return { ...outputPayload.value, series: reordered }
})

function onSeriesMove({ from, to }: { from: number; to: number }) {
  const names = orderedPayload.value.series.map((s) => s.name)
  if (from < 0 || from >= names.length || to < 0 || to >= names.length) {
    return
  }
  const [moved] = names.splice(from, 1)
  if (moved === undefined) return
  names.splice(to, 0, moved)
  seriesOrder.value = names
}

const submitError = computed<string | null>(() => {
  if (!hasEnoughData.value) return null
  if (valueColumns.value.length === 0) {
    return $t('chartsCsvNoValues', 'Pick at least one value column to import.')
  }
  if (outputPayload.value.series.length === 0) {
    return $t(
      'chartsCsvEmptyOutput',
      'No data after filtering — adjust filter selections.',
    )
  }
  if (outputPayload.value.categories.length === 0) {
    return $t(
      'chartsCsvNoCategories',
      'No categories produced — check the Category column and filters.',
    )
  }
  return null
})

const canSubmit = computed(
  () => hasEnoughData.value && submitError.value === null,
)

function onSubmit() {
  if (!canSubmit.value) return
  savedConfig.value = {
    transpose: transpose.value,
    reverseRows: reverseRows.value,
    sort: sort.value,
    categoryColumn: categoryColumn.value,
    valueColumns: valueColumns.value,
    groupByColumns: groupByColumns.value,
    filters: filters.value,
    seriesOrder: orderedPayload.value.series.map((s) => s.name),
  }
  emit('submit', orderedPayload.value)
}
</script>
