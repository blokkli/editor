<template>
  <div class="bg-mono-100 h-full flex flex-col" @wheel.capture.stop>
    <div class="bg-mono-900 sticky top-0 z-50">
      <div class="flex border-b border-mono-700">
        <div class="bk-chart-editor-actions">
          <button type="button" :disabled="!canUndo" @click="undo">
            <Icon name="bk_mdi_undo" />
          </button>
          <button type="button" :disabled="!canRedo" @click="redo">
            <Icon name="bk_mdi_redo" />
          </button>
        </div>

        <ChartTypePicker v-model="chartData.type" />
      </div>
    </div>

    <div class="grid grid-cols-[1fr_auto] flex-1 h-full">
      <div class="relative bg-white border-r border-r-mono-300 overflow-hidden">
        <div class="absolute top-0 left-0 size-full">
          <div class="flex gap-20 p-20">
            <FormToggle
              v-model="autoUpdate"
              :label="$t('chartsAutoUpdate', 'Auto-update')"
            />

            <button
              v-if="!autoUpdate"
              type="button"
              class="bk-button bk-scheme-mono bk-is-light bk-is-small"
              @click="refreshPreview"
            >
              {{ $t('chartsRefreshPreview', 'Refresh Preview') }}
            </button>
          </div>
          <Preview
            :uuid
            :option-key="optionKey"
            :data="previewData"
            :stale="isStale"
          />
        </div>
      </div>

      <Resizable
        id="chart-editor"
        class="h-full max-h-full relative w-[400px]"
        @done="refreshPreview"
      >
        <div
          class="absolute top-0 left-0 size-full p-20 overflow-auto bk-scrollbar-light"
        >
          <PanelSection :title="$t('chartsData', 'Data')">
            <div>
              <DataTable
                :categories="chartData.categories"
                :series="chartData.series"
                :category-colors="chartData.categoryColors"
                :has-multiple-series="caps.hasMultipleSeries"
                :has-series-colors="caps.hasSeriesColors"
                :has-category-colors="caps.hasCategoryColors"
                :colors="COLORS"
                :remove-row="removeRow"
                :remove-series="removeSeries"
                @update:categories="chartData.categories = $event"
                @update:series="chartData.series = $event"
                @update:category-colors="chartData.categoryColors = $event"
              />
            </div>

            <template #actions>
              <PanelAction
                :title="$t('chartsAddRow', 'Add row')"
                icon="bk_mdi_add_row_below"
                @click="addRow"
              />
              <PanelAction
                v-if="caps.hasMultipleSeries"
                :title="$t('chartsAddColumn', 'Add column')"
                icon="bk_mdi_add_column_right"
                @click="addSeries"
              />
              <CsvImport :colors="COLORS" @import="importData" />
              <PanelAction
                :title="$t('chartsReverseRows', 'Reverse rows')"
                icon="bk_mdi_table_convert"
                @click="reverseRows"
              />
            </template>
          </PanelSection>

          <FootnoteEditor
            :footnotes="chartData.footnotes"
            @update:footnotes="chartData.footnotes = $event"
          />

          <NumberFormatEditor
            :format="chartData.numberFormat ?? {}"
            @update:format="
              chartData.numberFormat =
                Object.keys($event).length > 0 ? $event : undefined
            "
          />

          <PanelSection
            v-if="chartDef"
            :title="$t('chartsSettings', 'Settings')"
          >
            <ChartTypeOptions
              v-model:title="chartData.title"
              :options="chartDef.editor.options"
              :type-options="chartData.typeOptions || {}"
              @update:type-options="chartData.typeOptions = $event"
            />
          </PanelSection>
        </div>
      </Resizable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useBlokkli, onBeforeUnmount } from '#imports'
import type { BlokkliChartData } from '../../../types'
import { getDefaultChartData, getFirstColorId } from '../../../helpers'
import { getChartType, getDefaultTypeOptions } from '../../../chartTypes'
import { COLORS } from '#blokkli-build/charts-config'
import { useChartEditorState } from './useChartEditorState'
import { Icon, FormToggle, Resizable } from '#blokkli/editor/components'
import ChartTypePicker from './ChartTypePicker/index.vue'
import DataTable from './DataTable/index.vue'
import CsvImport from './CsvImport/index.vue'
import FootnoteEditor from './FootnoteEditor/index.vue'
import NumberFormatEditor from './NumberFormatEditor/index.vue'
import Preview from './Preview/index.vue'
import ChartTypeOptions from './ChartTypeOptions/index.vue'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import PanelAction from '#blokkli/editor/components/Panel/Action/index.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const props = defineProps<{
  data: BlokkliChartData | null
  uuid: string
  optionKey: string
}>()

const { $t } = useBlokkli()

function getCurrentData(): BlokkliChartData {
  if (props.data) {
    const parsed = JSON.parse(JSON.stringify(props.data))
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
  }
  return getDefaultChartData(COLORS)
}

const {
  data: chartData,
  canUndo,
  canRedo,
  undo,
  redo,
  addRow,
  addSeries,
  removeRow,
  removeSeries,
  importData,
  reverseRows,
} = useChartEditorState(getCurrentData(), COLORS)

const autoUpdate = ref(true)
const previewData = ref<BlokkliChartData>(
  JSON.parse(JSON.stringify(chartData.value)),
)
const isStale = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function refreshPreview() {
  previewData.value = JSON.parse(JSON.stringify(chartData.value))
  isStale.value = false
}

watch(
  chartData,
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

const chartDef = computed(() => getChartType(chartData.value.type, $t))
const caps = computed(() => {
  const def = chartDef.value
  return {
    hasMultipleSeries: def?.hasMultipleSeries ?? true,
    hasSeriesColors: def?.hasSeriesColors ?? true,
    hasCategoryColors: def?.hasCategoryColors ?? false,
  }
})

const typeOptionsCache: Record<string, unknown> = {
  ...chartData.value.typeOptions,
}

watch(
  () => chartData.value.type,
  (type) => {
    const defaults = getDefaultTypeOptions(type)
    const merged: Record<string, unknown> = {}
    for (const key of Object.keys(defaults)) {
      merged[key] =
        key in typeOptionsCache ? typeOptionsCache[key] : defaults[key]
    }
    chartData.value.typeOptions = merged
  },
)

watch(
  () => chartData.value.typeOptions,
  (opts) => {
    if (opts) {
      Object.assign(typeOptionsCache, opts)
    }
  },
  { deep: true },
)

function getData(): BlokkliChartData {
  return chartData.value
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
