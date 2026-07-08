<template>
  <ResizableEditorView
    id="chart-editor"
    :min-width-right="600"
    :min-width-left="400"
    @after-resize="refreshPreview"
  >
    <template #toolbar>
      <div class="flex items-center border-r border-r-mono-600">
        <button
          type="button"
          class="bk-toolbar-button"
          :disabled="!canUndo"
          @click="undo"
        >
          <Icon name="bk_mdi_undo" />
        </button>
        <button
          type="button"
          :disabled="!canRedo"
          class="bk-toolbar-button"
          @click="redo"
        >
          <Icon name="bk_mdi_redo" />
        </button>
      </div>
      <FormToggle
        v-model="autoUpdate"
        :label="$t('chartsAutoUpdate', 'Auto-update')"
        color-scheme="dark"
        stretch
        class="pl-15"
      />
      <button
        v-if="!autoUpdate"
        type="button"
        class="bk-button bk-scheme-mono bk-is-small"
        @click="refreshPreview"
      >
        {{ $t('chartsRefreshPreview', 'Refresh Preview') }}
      </button>
    </template>

    <template #left>
      <Preview
        :uuid
        :option-key="optionKey"
        :data="previewData"
        :dynamic-data="previewDynamicData"
        :stale="isStale"
      />
    </template>

    <template #right>
      <template v-if="!isTranslation">
        <PanelSection :title="$t('chartsType', 'Chart Type')">
          <ChartTypePicker
            :model-value="chartData.type"
            @update:model-value="onChangeType"
          />
        </PanelSection>
        <AdvancedConfigPanel v-if="isAdvanced" v-model="advancedConfig" />
        <PanelSection v-if="!isAdvanced" :title="$t('data', 'Data')">
          <template v-if="capabilities" #tabs>
            <PanelTabs v-model="dataTab" :tabs="dataTabs" />
          </template>

          <template v-if="dataTab === 'dynamic' && capabilities">
            <DataSourcePicker
              :capabilities
              :selected="selectedDataSource"
              @select="onSelectDataSource"
              @clear="onClearDataSource"
              @update:known-ids="onKnownIdsUpdated"
            />
            <template v-if="chartData.dataSource">
              <DynamicPreviewStatus
                :status="previewStatus"
                :error="previewError ?? null"
                :missing="sourceMissing"
                :missing-label="chartData.dataSource.label"
                :empty="previewEmpty"
              />
              <OrphanOverridesWarning
                v-if="previewPayload"
                :series-override-names="seriesOverrideNames"
                :category-override-names="categoryOverrideNames"
                :known-series="previewSeriesNames"
                :known-categories="previewPayload.categories"
                @remove="onRemoveOrphan"
              />
              <SeriesOverridesPanel
                v-if="previewPayload"
                :series-names="previewSeriesNames"
                :overrides="chartData.dataSource.seriesOverrides ?? {}"
                :has-series-colors="caps.hasSeriesColors"
                @update:overrides="onUpdateSeriesOverrides"
              />
              <CategoryColorOverridesPanel
                v-if="previewPayload && caps.hasCategoryColors"
                :categories="previewPayload.categories"
                :overrides="chartData.dataSource.categoryColorOverrides ?? {}"
                @update:overrides="onUpdateCategoryOverrides"
              />
            </template>
          </template>

          <template v-else-if="dataTab === 'custom'">
            <div v-if="dataTooLarge" class="p-panel-gap">
              <InfoBox
                small
                :text="
                  $t(
                    'chartsDataTableHidden',
                    'Data table hidden because the dataset is too large to edit cell-by-cell (@cells cells, max @max). Re-import a smaller CSV to edit values inline.',
                  )
                    .replace('@cells', String(cellCount))
                    .replace('@max', String(MAX_DATA_TABLE_CELLS))
                "
              />
            </div>
            <template v-else>
              <div class="overflow-auto bk-scrollbar-light relative z-50">
                <DataTable
                  :categories="chartData.categories"
                  :series="chartData.series"
                  :category-colors="chartData.categoryColors"
                  :has-series-colors="caps.hasSeriesColors"
                  :has-category-colors="caps.hasCategoryColors"
                  :remove-row="removeRow"
                  :remove-series="removeSeries"
                  @update:categories="chartData.categories = $event"
                  @update:series="chartData.series = $event"
                  @update:category-colors="chartData.categoryColors = $event"
                  @add-column="addSeries"
                />
              </div>
              <PanelAddButton
                :label="$t('chartsAddRow', 'Add row')"
                icon="bk_mdi_add_row_below"
                @click.prevent="addRow"
              />
            </template>
          </template>

          <template v-if="dataTab === 'custom'" #actions>
            <CsvImport @import="importData" />
            <CsvExport
              v-if="!chartData.dataSource"
              :title="chartData.title"
              :categories="chartData.categories"
              :series="chartData.series"
            />
            <PanelAction
              :title="$t('chartsReverseRows', 'Reverse rows')"
              icon="bk_mdi_table_convert"
              @click="reverseRows"
            />
          </template>
        </PanelSection>

        <template v-if="!isAdvanced">
          <FootnoteEditor
            :footnotes="chartData.footnotes"
            :add-footnote="addFootnote"
            :remove-footnote="removeFootnote"
            :update-footnote="updateFootnote"
          />

          <NumberFormatEditor
            :format="chartData.numberFormat ?? {}"
            @update:format="
              chartData.numberFormat =
                Object.keys($event).length > 0 ? $event : undefined
            "
          >
            <DateFormatEditor
              v-if="hasDateFormattedCategories"
              :format="chartData.dateFormat ?? {}"
              :categories="chartData.categories"
              :locale="chartData.numberFormat?.locale"
              @update:format="
                chartData.dateFormat =
                  Object.keys($event).filter(
                    (k) => $event[k as keyof typeof $event] !== undefined,
                  ).length > 0
                    ? $event
                    : undefined
              "
            />
          </NumberFormatEditor>

          <PanelSection
            v-if="chartDef"
            :title="$t('settings', 'Settings')"
            padded
          >
            <ChartTypeOptions
              v-model:title="chartData.title"
              :options="chartDef.editor.options"
              :type-options="chartData.typeOptions || {}"
              @update:type-options="chartData.typeOptions = $event"
            />
          </PanelSection>
        </template>
      </template>
      <TranslationsEditor
        v-if="!isAdvanced"
        v-model:translations="chartData.translations"
        :chart-data="effectiveChartData"
        :has-numeric-categories
        :has-date-formatted-categories="hasDateFormattedCategories"
      />
      <PanelSection
        v-else-if="isTranslation"
        :title="$t('translate', 'Translate')"
      >
        <div class="p-panel-gap text-mono-700">
          {{
            $t(
              'chartsAdvancedNoTranslations',
              'Advanced charts have no translatable strings — the ECharts configuration is stored as-is.',
            )
          }}
        </div>
      </PanelSection>
    </template>
  </ResizableEditorView>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  useAsyncData,
  useBlokkli,
  onBeforeUnmount,
} from '#imports'
import type {
  BlokkliChartData,
  ChartAdvancedConfig,
  ChartDataSource,
  ChartSeriesOverride,
  ChartType,
} from '../../../types'
import {
  ADVANCED_DEFAULT_PARSED,
  ADVANCED_DEFAULT_SOURCE,
} from '../../../blokkli/chart-types/advanced/definition'
// Load adapter type augmentation (declare module).
import '#blokkli/charts/adapter'
import {
  categoriesAreDates,
  categoriesAreNumeric,
  getColorIdAtIndex,
  getDefaultChartData,
  getFirstColorId,
} from '../../../helpers'
import { isColorIdValid } from '#blokkli/helpers/colors'
import { getChartType, getDefaultTypeOptions } from '../../../chart-types'
import { useChartEditorState } from './useChartEditorState'
import { useChartDataSourcePreview } from './useChartDataSourcePreview'
import { Icon, FormToggle, InfoBox } from '#blokkli/editor/components'
import ChartTypePicker from './ChartTypePicker/index.vue'
import DataTable from './DataTable/index.vue'
import CsvImport from './CsvImport/index.vue'
import CsvExport from './CsvExport/index.vue'
import FootnoteEditor from './FootnoteEditor/index.vue'
import NumberFormatEditor from './NumberFormatEditor/index.vue'
import DateFormatEditor from './DateFormatEditor/index.vue'
import TranslationsEditor from './TranslationsEditor/index.vue'
import Preview from './Preview/index.vue'
import ChartTypeOptions from './ChartTypeOptions/index.vue'
import DataSourcePicker from './DataSourcePicker/index.vue'
import DynamicPreviewStatus from './DynamicPreviewStatus/index.vue'
import SeriesOverridesPanel from './SeriesOverridesPanel/index.vue'
import CategoryColorOverridesPanel from './CategoryColorOverridesPanel/index.vue'
import OrphanOverridesWarning from './OrphanOverridesWarning/index.vue'
import AdvancedConfigPanel from './AdvancedConfigPanel/index.vue'
import type { OrphanOverride } from './OrphanOverridesWarning/index.vue'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import PanelTabs from '#blokkli/editor/components/Panel/Tabs/index.vue'
import PanelAction from '#blokkli/editor/components/Panel/Action/index.vue'
import PanelAddButton from '#blokkli/editor/components/Panel/AddButton/index.vue'
import ResizableEditorView from '#blokkli/editor/components/ResizableEditorView/index.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const props = defineProps<{
  data: BlokkliChartData | null
  uuid: string
  optionKey: string
}>()

const { $t, config, state, adapter } = useBlokkli()

const isTranslation = computed(() => state.editMode.value === 'translating')

const colorOptions = config.colorOptions.value

function getCurrentData(): BlokkliChartData {
  if (props.data) {
    const parsed = JSON.parse(JSON.stringify(props.data))
    const isAdvanced = parsed?.type === 'advanced'
    const hasSeries = Array.isArray(parsed?.series) && parsed.series.length > 0
    if (parsed && (isAdvanced || hasSeries)) {
      if (!isAdvanced) {
        const fallbackId = getFirstColorId(colorOptions)
        for (const series of parsed.series) {
          if (!isColorIdValid(series.color, colorOptions)) {
            series.color = fallbackId
          }
        }
        if (Array.isArray(parsed.categoryColors)) {
          for (let i = 0; i < parsed.categoryColors.length; i++) {
            if (!isColorIdValid(parsed.categoryColors[i], colorOptions)) {
              parsed.categoryColors[i] = fallbackId
            }
          }
        } else {
          parsed.categoryColors = parsed.categories.map(
            (_: string, i: number) => getColorIdAtIndex(i, colorOptions),
          )
        }
      } else {
        if (!Array.isArray(parsed.series)) parsed.series = []
        if (!Array.isArray(parsed.categories)) parsed.categories = []
        if (!Array.isArray(parsed.categoryColors)) parsed.categoryColors = []
        // Ensure advancedConfig is fully populated. Persisted data only has
        // `parsed`; we hydrate `source` here so the textarea has something
        // to show without round-tripping through formatting on every render.
        const ac = parsed.advancedConfig
        const parsedObj =
          ac && typeof ac.parsed === 'object' && ac.parsed !== null
            ? ac.parsed
            : { ...ADVANCED_DEFAULT_PARSED }
        const source =
          ac && typeof ac.source === 'string'
            ? ac.source
            : JSON.stringify(parsedObj, null, 2)
        parsed.advancedConfig = { parsed: parsedObj, source }
      }
      if (!Array.isArray(parsed.footnotes)) {
        parsed.footnotes = []
      }
      if (!parsed.typeOptions || typeof parsed.typeOptions !== 'object') {
        parsed.typeOptions = getDefaultTypeOptions(parsed.type)
      }
      normalizeTranslations(parsed)
      if (!parsed.translations) {
        parsed.translations = {}
      }
      return parsed
    }
  }
  const fresh = getDefaultChartData(colorOptions)
  if (!fresh.translations) {
    fresh.translations = {}
  }
  return fresh
}

function padOrTrim(arr: unknown, length: number): string[] {
  const source = Array.isArray(arr) ? (arr as unknown[]) : []
  const out: string[] = []
  for (let i = 0; i < length; i++) {
    const v = source[i]
    out.push(typeof v === 'string' ? v : '')
  }
  return out
}

function normalizeTranslations(parsed: BlokkliChartData) {
  if (!parsed.translations || typeof parsed.translations !== 'object') {
    return
  }
  const cleaned: Record<
    string,
    NonNullable<BlokkliChartData['translations']>[string]
  > = {}
  for (const lang of Object.keys(parsed.translations)) {
    const t = parsed.translations[lang]
    if (!t || typeof t !== 'object') continue
    cleaned[lang] = {
      title: typeof t.title === 'string' ? t.title : '',
      categories: padOrTrim(t.categories, parsed.categories.length),
      seriesNames: padOrTrim(t.seriesNames, parsed.series.length),
      footnotes: padOrTrim(t.footnotes, parsed.footnotes.length),
      prefix: typeof t.prefix === 'string' ? t.prefix : '',
      suffix: typeof t.suffix === 'string' ? t.suffix : '',
    }
  }
  parsed.translations = cleaned
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
  addFootnote,
  removeFootnote,
  updateFootnote,
  setType,
} = useChartEditorState(getCurrentData(), colorOptions)

// The active "mode" the user is in. The tab is the source of truth for
// what is shown and what is persisted — it doesn't mutate chartData. The
// inline categories/series stay on the block as "shadow" data even while
// a dataSource is selected, so flipping back to Custom restores them
// without any state shuffling.
const dataTab = ref<'custom' | 'dynamic'>(
  chartData.value.dataSource ? 'dynamic' : 'custom',
)

// View of chartData that respects the current tab. When the user is on
// the Custom tab, the dataSource is dropped so every downstream consumer
// (renderer, translations editor, persistence) sees the chart as inline
// data — even if a source is still stashed on the block.
const effectiveChartData = computed<BlokkliChartData>(() => {
  if (dataTab.value === 'custom' && chartData.value.dataSource) {
    return { ...chartData.value, dataSource: undefined }
  }
  return chartData.value
})

function getData(): BlokkliChartData {
  const data = effectiveChartData.value
  // The textarea source is editor-only state — strip it before persisting.
  if (data.type === 'advanced' && data.advancedConfig?.source !== undefined) {
    return {
      ...data,
      advancedConfig: { parsed: data.advancedConfig.parsed },
    }
  }
  return data
}

defineExpose({ getData })

const autoUpdate = ref(true)
const previewData = ref<BlokkliChartData>(
  JSON.parse(JSON.stringify(effectiveChartData.value)),
)
const isStale = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function refreshPreview() {
  previewData.value = JSON.parse(JSON.stringify(effectiveChartData.value))
  isStale.value = false
}

watch(
  effectiveChartData,
  () => {
    if (autoUpdate.value) {
      if (debounceTimer) clearTimeout(debounceTimer)
      isStale.value = true
      // Advanced mode parses raw JSON5 on every keystroke and re-renders the
      // full echarts option, so we wait longer to avoid flickering and broken
      // intermediate parses while the user types.
      const delay = isAdvanced.value ? 1500 : 500
      debounceTimer = setTimeout(refreshPreview, delay)
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

const isAdvanced = computed(() => chartData.value.type === 'advanced')

function onChangeType(next: ChartType) {
  setType(next)
  if (next === 'advanced' && !chartData.value.advancedConfig) {
    chartData.value.advancedConfig = {
      parsed: { ...ADVANCED_DEFAULT_PARSED },
      source: ADVANCED_DEFAULT_SOURCE,
    }
  }
}

const advancedConfig = computed<ChartAdvancedConfig>({
  get: () =>
    chartData.value.advancedConfig ?? {
      parsed: { ...ADVANCED_DEFAULT_PARSED },
      source: ADVANCED_DEFAULT_SOURCE,
    },
  set: (next: ChartAdvancedConfig) => {
    chartData.value.advancedConfig = next
  },
})

const chartDef = computed(() => getChartType(chartData.value.type, $t))
const caps = computed(() => {
  const def = chartDef.value
  return {
    hasSeriesColors: def?.hasSeriesColors ?? true,
    hasCategoryColors: def?.hasCategoryColors ?? false,
  }
})

const MAX_DATA_TABLE_CELLS = 200

const cellCount = computed(
  () => chartData.value.categories.length * chartData.value.series.length,
)
const dataTooLarge = computed(() => cellCount.value > MAX_DATA_TABLE_CELLS)

const hasNumericCategories = computed(() =>
  categoriesAreNumeric(chartData.value.categories),
)

const hasDateFormattedCategories = computed(() =>
  categoriesAreDates(chartData.value.categories),
)

// --- Dynamic data sources ---

const { data: capabilities } = await useAsyncData(
  () =>
    adapter.getChartDataSourceCapabilities
      ? Promise.resolve(adapter.getChartDataSourceCapabilities())
      : Promise.resolve(null),
  { default: () => null },
)

// If the adapter doesn't support data sources but a saved chart still has
// a dataSource ref, fall back to the Custom tab so the user can interact
// with the inline data.
if (!capabilities.value && dataTab.value === 'dynamic') {
  dataTab.value = 'custom'
}

const dataTabs = computed(() => [
  { id: 'custom' as const, label: $t('chartsDataTabCustom', 'Custom data') },
  { id: 'dynamic' as const, label: $t('chartsDataTabDynamic', 'Dynamic data') },
])

const knownSourceIds = ref<Set<string>>(new Set())

const currentSourceId = computed(() => chartData.value.dataSource?.id)

const {
  status: previewStatus,
  error: previewError,
  payload: previewPayload,
} = useChartDataSourcePreview(currentSourceId)

const sourceMissing = computed(() => {
  const id = chartData.value.dataSource?.id
  if (!id) return false
  if (knownSourceIds.value.size === 0) return false
  return !knownSourceIds.value.has(id)
})

const selectedDataSource = computed<ChartDataSource | null>(() => {
  const ref = chartData.value.dataSource
  if (!ref) return null
  return {
    id: ref.id,
    label: ref.label,
  }
})

const previewSeriesNames = computed<string[]>(() => {
  return previewPayload.value?.series.map((s) => s.name) ?? []
})

const previewEmpty = computed(() => {
  const p = previewPayload.value
  if (!p) return false
  return p.categories.length === 0 || p.series.length === 0
})

const seriesOverrideNames = computed(() =>
  Object.keys(chartData.value.dataSource?.seriesOverrides ?? {}),
)

const categoryOverrideNames = computed(() =>
  Object.keys(chartData.value.dataSource?.categoryColorOverrides ?? {}),
)

// Compute the preview's dynamicData snapshot used by the Preview component.
// We snapshot on each preview refresh so toggling autoUpdate behaves
// consistently with the rest of the preview pipeline.
const previewDynamicData = computed(() => {
  if (!previewData.value.dataSource) return null
  return previewPayload.value
})

function onSelectDataSource(source: ChartDataSource) {
  chartData.value.dataSource = {
    id: source.id,
    label: source.label,
  }
}

function onClearDataSource() {
  chartData.value.dataSource = undefined
}

function onKnownIdsUpdated(ids: Set<string>) {
  knownSourceIds.value = ids
}

function onUpdateSeriesOverrides(
  overrides: Record<string, ChartSeriesOverride>,
) {
  if (!chartData.value.dataSource) return
  chartData.value.dataSource = {
    ...chartData.value.dataSource,
    seriesOverrides:
      Object.keys(overrides).length === 0 ? undefined : overrides,
  }
}

function onUpdateCategoryOverrides(overrides: Record<string, string>) {
  if (!chartData.value.dataSource) return
  chartData.value.dataSource = {
    ...chartData.value.dataSource,
    categoryColorOverrides:
      Object.keys(overrides).length === 0 ? undefined : overrides,
  }
}

function withoutKey<V>(
  source: Record<string, V> | undefined,
  key: string,
): Record<string, V> {
  const next: Record<string, V> = {}
  if (source) {
    for (const k of Object.keys(source)) {
      if (k !== key) next[k] = source[k]!
    }
  }
  return next
}

function onRemoveOrphan(orphan: OrphanOverride) {
  if (!chartData.value.dataSource) return
  if (orphan.scope === 'series') {
    onUpdateSeriesOverrides(
      withoutKey(chartData.value.dataSource.seriesOverrides, orphan.name),
    )
  } else {
    onUpdateCategoryOverrides(
      withoutKey(
        chartData.value.dataSource.categoryColorOverrides,
        orphan.name,
      ),
    )
  }
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
</script>
