<template>
  <DialogModal
    id="charts-csv-preview"
    :title="$t('chartsCsvPreviewTitle', 'Preview CSV import')"
    :lead="
      $t(
        'chartsCsvPreviewLead',
        'Review the data that will be imported. Adjust orientation and pick which columns to include.',
      )
    "
    :width="1680"
    icon="bk_mdi_csv"
    :submit-label="$t('chartsCsvPreviewSubmit', 'Import')"
    :can-submit="canSubmit"
    @submit="onSubmit"
    @cancel="$emit('cancel')"
  >
    <FormGroup :title="$t('chartsCsvOptions', 'Options')">
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
      </FormItem>
      <FormItem>
        <FormToggle
          v-model="reverseRows"
          :label="$t('chartsCsvReverseRows', 'Reverse row order')"
        />
      </FormItem>
      <FormItem>
        <FormToggle
          v-model="reverseColumns"
          :label="$t('chartsCsvReverseColumns', 'Reverse column order')"
        />
      </FormItem>
    </FormGroup>

    <FormGroup :title="$t('chartsCsvPreviewSection', 'Preview')">
      <div v-if="!hasEnoughData" class="mb-15">
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
      <div
        v-else
        class="bk-csv-preview-table-wrap overflow-auto bk-scrollbar-light border border-mono-300 rounded"
      >
        <table class="bk-csv-preview-table">
          <thead>
            <tr>
              <th class="bk-csv-preview-category-header">
                {{ $t('chartsCsvCategoriesHeader', 'Categories') }}
              </th>
              <th
                v-for="(name, si) in seriesHeaders"
                :key="si"
                class="bk-csv-preview-series-header"
              >
                <label class="bk-checkbox bk-is-stacked">
                  <input
                    type="checkbox"
                    :checked="selectedSeriesIndices.includes(si)"
                    @change="toggleSeries(si)"
                  />
                  <span>{{ name || `Series ${si + 1}` }}</span>
                </label>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in visibleRows" :key="ri">
              <td class="bk-csv-preview-category-cell">{{ row[0] }}</td>
              <td
                v-for="(name, si) in seriesHeaders"
                :key="si"
                :class="{
                  'bk-is-excluded': !selectedSeriesIndices.includes(si),
                }"
              >
                {{ row[si + 1] ?? '' }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="hiddenRowCount > 0" class="bk-csv-preview-more">
          {{
            $t('chartsCsvMoreRows', '+ @count more rows').replace(
              '@count',
              String(hiddenRowCount),
            )
          }}
        </div>
      </div>
      <div
        v-if="hasEnoughData && selectedSeriesIndices.length === 0"
        class="mt-10"
      >
        <InfoBox
          small
          :text="
            $t('chartsCsvNoSeries', 'Select at least one column to import.')
          "
        />
      </div>
    </FormGroup>
  </DialogModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, useBlokkli } from '#imports'
import {
  DialogModal,
  FormGroup,
  FormItem,
  FormToggle,
  InfoBox,
} from '#blokkli/editor/components'
import {
  type CsvGrid,
  type CsvImportPayload,
  gridToImportPayload,
  reverseRowsKeepingHeader,
  reverseSeriesColumns,
  selectSeriesColumns,
  transposeGrid,
} from './csvHelpers'

const PREVIEW_ROW_LIMIT = 20

const props = defineProps<{
  grid: CsvGrid
}>()

const emit = defineEmits<{
  submit: [payload: CsvImportPayload]
  cancel: []
}>()

const { $t, config } = useBlokkli()

const transpose = ref(false)
const reverseRows = ref(false)
const reverseColumns = ref(false)

/**
 * Grid after orientation changes (transpose + reverses), before column
 * filtering. The preview table renders this so users can see every column they
 * could include.
 */
const orientedGrid = computed<CsvGrid>(() => {
  let grid = props.grid
  if (transpose.value) grid = transposeGrid(grid)
  if (reverseRows.value) grid = reverseRowsKeepingHeader(grid)
  if (reverseColumns.value) grid = reverseSeriesColumns(grid)
  return grid
})

const seriesHeaders = computed<string[]>(() => {
  const header = orientedGrid.value[0]
  if (!header) return []
  return header.slice(1)
})

const visibleRows = computed<string[][]>(() => {
  return orientedGrid.value.slice(1, 1 + PREVIEW_ROW_LIMIT)
})

const hiddenRowCount = computed(() => {
  const dataRows = Math.max(0, orientedGrid.value.length - 1)
  return Math.max(0, dataRows - PREVIEW_ROW_LIMIT)
})

const hasEnoughData = computed(() => {
  return orientedGrid.value.length >= 2 && seriesHeaders.value.length > 0
})

const selectedSeriesIndices = ref<number[]>([])

function resetSelection() {
  selectedSeriesIndices.value = seriesHeaders.value.map((_, i) => i)
}

watch(
  seriesHeaders,
  () => {
    resetSelection()
  },
  { immediate: true },
)

function toggleSeries(index: number) {
  if (selectedSeriesIndices.value.includes(index)) {
    selectedSeriesIndices.value = selectedSeriesIndices.value.filter(
      (i) => i !== index,
    )
  } else {
    selectedSeriesIndices.value = [...selectedSeriesIndices.value, index]
  }
}

const canSubmit = computed(() => {
  return hasEnoughData.value && selectedSeriesIndices.value.length > 0
})

function onSubmit() {
  if (!canSubmit.value) return
  const finalGrid = selectSeriesColumns(
    orientedGrid.value,
    selectedSeriesIndices.value,
  )
  emit('submit', gridToImportPayload(finalGrid, config.colorOptions.value))
}
</script>

<style lang="postcss">
.bk-csv-preview-table-wrap {
  max-height: 600px;
}

.bk-csv-preview-table {
  @apply w-full text-sm border-collapse;

  th,
  td {
    @apply border-b border-r border-mono-200 p-10 text-left align-top;
    &:last-child {
      @apply border-r-0;
    }
  }

  thead th {
    @apply bg-mono-50 sticky top-0 font-semibold text-mono-800 border-b-mono-300;
  }

  tbody tr:last-child td {
    @apply border-b-0;
  }

  .bk-csv-preview-category-header,
  .bk-csv-preview-category-cell {
    @apply bg-mono-50 font-semibold text-mono-800;
  }

  td.bk-is-excluded {
    @apply text-mono-400 line-through;
  }
}

.bk-csv-preview-more {
  @apply p-10 text-center text-mono-600 text-sm bg-mono-50 border-t border-mono-200;
}

.bk-checkbox.bk-is-stacked {
  @apply flex flex-col items-start gap-5 cursor-pointer;
  span {
    @apply text-sm;
  }
}
</style>
