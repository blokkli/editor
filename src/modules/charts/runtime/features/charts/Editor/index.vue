<template>
  <div class="bk-chart-editor" @wheel.capture.stop>
    <div class="bk-chart-editor-top">
      <div class="bk-chart-editor-top-actions">
        <div class="bk-chart-editor-actions">
          <button type="button" :disabled="!canUndo" @click="undo">
            <Icon name="bk_mdi_undo" />
          </button>
          <button type="button" :disabled="!canRedo" @click="redo">
            <Icon name="bk_mdi_redo" />
          </button>
        </div>

        <ChartTypePicker v-model="data.type" />
      </div>

      <ChartTypeOptions
        v-if="chartDef"
        v-model:title="data.title"
        :options="chartDef.editor.options"
        :type-options="data.typeOptions || {}"
        @update:type-options="data.typeOptions = $event"
      />
    </div>

    <div class="bk-chart-editor-main">
      <div class="bk-chart-editor-section">
        <div class="bk-chart-editor-preview-header">
          <label class="bk-form-label">{{
            $t('chartsPreview', 'Preview')
          }}</label>
          <div class="bk-chart-editor-preview-actions">
            <button
              v-if="!autoUpdate"
              type="button"
              class="bk-button bk-is-small"
              @click="refreshPreview"
            >
              {{ $t('chartsRefreshPreview', 'Refresh Preview') }}
            </button>
            <FormToggle
              v-model="autoUpdate"
              :label="$t('chartsAutoUpdate', 'Auto-update')"
            />
          </div>
        </div>
        <Preview :data="previewData" :stale="isStale" />
      </div>

      <div class="bk-chart-editor-section">
        <label class="bk-form-label">{{ $t('chartsData', 'Data') }}</label>
        <DataTable
          :categories="data.categories"
          :series="data.series"
          :category-colors="data.categoryColors"
          :has-multiple-series="caps.hasMultipleSeries"
          :has-series-colors="caps.hasSeriesColors"
          :has-category-colors="caps.hasCategoryColors"
          :colors="COLORS"
          :remove-row="removeRow"
          :remove-series="removeSeries"
          @update:categories="data.categories = $event"
          @update:series="data.series = $event"
          @update:category-colors="data.categoryColors = $event"
        />
        <div class="bk-chart-data-table-actions">
          <button type="button" class="bk-button bk-is-small" @click="addRow">
            <Icon name="bk_mdi_add_row_below" />
            {{ $t('chartsAddRow', 'Add row') }}
          </button>
          <button
            v-if="caps.hasMultipleSeries"
            type="button"
            class="bk-button bk-is-small"
            @click="addSeries"
          >
            <Icon name="bk_mdi_add_column_right" />
            {{ $t('chartsAddColumn', 'Add column') }}
          </button>
          <CsvImport :colors="COLORS" @import="importData" />
        </div>
      </div>

      <div class="bk-chart-editor-section">
        <FootnoteEditor
          :footnotes="data.footnotes"
          @update:footnotes="data.footnotes = $event"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useBlokkli, onBeforeUnmount } from '#imports'
import type { BlokkliChartData } from '../../../types'
import { getDefaultChartData, getFirstColorId } from '../../../types'
import { getChartType, getDefaultTypeOptions } from '../../../chartTypes'
import { COLORS } from '#blokkli-build/charts-config'
import { useChartEditorState } from './useChartEditorState'
import { Icon, FormToggle } from '#blokkli/editor/components'
import ChartTypePicker from './ChartTypePicker/index.vue'
import DataTable from './DataTable/index.vue'
import CsvImport from './CsvImport/index.vue'
import FootnoteEditor from './FootnoteEditor/index.vue'
import Preview from './Preview/index.vue'
import ChartTypeOptions from './ChartTypeOptions/index.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const props = defineProps<{
  uuid: string
}>()

const { $t, state } = useBlokkli()

function getCurrentData(): BlokkliChartData {
  const options = state.getFieldListItem(props.uuid)?.options
  if (options?.data) {
    try {
      const parsed = JSON.parse(options.data)
      if (parsed && Array.isArray(parsed.series) && parsed.series.length > 0) {
        const fallbackId = getFirstColorId(COLORS)
        for (const series of parsed.series) {
          if (!COLORS[series.color]) {
            series.color = fallbackId
          }
        }
        if (Array.isArray(parsed.categoryColors)) {
          for (let i = 0; i < parsed.categoryColors.length; i++) {
            if (!COLORS[parsed.categoryColors[i]]) {
              parsed.categoryColors[i] = fallbackId
            }
          }
        } else {
          parsed.categoryColors = parsed.categories.map(
            (_: string, i: number) => {
              const ids = Object.keys(COLORS)
              return ids[i % ids.length] || fallbackId
            },
          )
        }
        if (!Array.isArray(parsed.footnotes)) {
          parsed.footnotes = []
        }
        if (!parsed.typeOptions || typeof parsed.typeOptions !== 'object') {
          parsed.typeOptions = getDefaultTypeOptions(parsed.type)
        }
        return parsed
      }
    } catch {
      // Ignore parse errors.
    }
  }
  return getDefaultChartData(COLORS)
}

const {
  data,
  canUndo,
  canRedo,
  undo,
  redo,
  addRow,
  addSeries,
  removeRow,
  removeSeries,
  importData,
} = useChartEditorState(getCurrentData(), COLORS)

const autoUpdate = ref(true)
const previewData = ref<BlokkliChartData>(
  JSON.parse(JSON.stringify(data.value)),
)
const isStale = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function refreshPreview() {
  previewData.value = JSON.parse(JSON.stringify(data.value))
  isStale.value = false
}

watch(
  data,
  () => {
    if (autoUpdate.value) {
      if (debounceTimer) clearTimeout(debounceTimer)
      isStale.value = true
      debounceTimer = setTimeout(refreshPreview, 500)
    } else {
      isStale.value = true
    }
  },
  { deep: true },
)

watch(autoUpdate, (enabled) => {
  if (enabled) {
    refreshPreview()
  }
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

const chartDef = computed(() => getChartType(data.value.type, $t))
const caps = computed(() => {
  const def = chartDef.value
  return {
    hasMultipleSeries: def?.hasMultipleSeries ?? true,
    hasSeriesColors: def?.hasSeriesColors ?? true,
    hasCategoryColors: def?.hasCategoryColors ?? false,
  }
})

const typeOptionsCache: Record<string, unknown> = {
  ...(data.value.typeOptions || {}),
}

watch(
  () => data.value.type,
  (type) => {
    const defaults = getDefaultTypeOptions(type)
    const merged: Record<string, unknown> = {}
    for (const key of Object.keys(defaults)) {
      merged[key] =
        key in typeOptionsCache ? typeOptionsCache[key] : defaults[key]
    }
    data.value.typeOptions = merged
  },
)

watch(
  () => data.value.typeOptions,
  (opts) => {
    if (opts) {
      Object.assign(typeOptionsCache, opts)
    }
  },
  { deep: true },
)

function getData(): BlokkliChartData {
  return data.value
}

onBlokkliEvent('keyPressed', (e) => {
  if (e.code === 'z' && e.meta) {
    e.originalEvent.preventDefault()
    if (canUndo.value) {
      undo()
    }
  } else if (e.code === 'Z' && e.meta && e.shift) {
    e.originalEvent.preventDefault()
    if (canRedo.value) {
      redo()
    }
  }
})

defineExpose({ getData })
</script>
