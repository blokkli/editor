import { ref, watch, nextTick, computed } from '#imports'
import type {
  BlokkliChartData,
  ChartSeries,
  ChartTranslation,
  ChartType,
} from '../../../types'
import type { ColorOption } from '#blokkli/editor/types/config'
import { getColorIdAtIndex } from '../../../helpers'
import { nextCategoryValue } from '../../../helpers/nextCategoryValue'
import { getDefaultTypeOptions } from '../../../chart-types'

const MAX_HISTORY = 50

function clone(v: BlokkliChartData): BlokkliChartData {
  return JSON.parse(JSON.stringify(v))
}

export function useChartEditorState(
  initial: BlokkliChartData,
  options: ColorOption[],
) {
  const data = ref<BlokkliChartData>(clone(initial))
  const stack = ref<BlokkliChartData[]>([clone(initial)])
  const index = ref(0)
  let isApplying = false

  const canUndo = computed(() => index.value > 0)
  const canRedo = computed(() => index.value < stack.value.length - 1)

  watch(
    data,
    (newVal) => {
      if (isApplying) return
      stack.value.splice(index.value + 1)
      stack.value.push(clone(newVal))
      if (stack.value.length > MAX_HISTORY) {
        stack.value.shift()
      }
      index.value = stack.value.length - 1
    },
    { deep: true },
  )

  function undo() {
    if (!canUndo.value) return
    isApplying = true
    index.value--
    data.value = clone(stack.value[index.value]!)
    nextTick(() => {
      isApplying = false
    })
  }

  function redo() {
    if (!canRedo.value) return
    isApplying = true
    index.value++
    data.value = clone(stack.value[index.value]!)
    nextTick(() => {
      isApplying = false
    })
  }

  function forEachTranslation(fn: (t: ChartTranslation) => void) {
    const translations = data.value.translations
    if (!translations) return
    for (const lang of Object.keys(translations)) {
      const t = translations[lang]
      if (t) fn(t)
    }
  }

  function addRow() {
    data.value.categories.push(nextCategoryValue(data.value.categories))
    for (const s of data.value.series) {
      s.data.push(0)
    }
    data.value.categoryColors.push(
      getColorIdAtIndex(data.value.categoryColors.length, options),
    )
    forEachTranslation((t) => {
      if (t.categories) t.categories.push('')
    })
  }

  function addSeries() {
    data.value.series.push({
      name: `Series ${data.value.series.length + 1}`,
      color: getColorIdAtIndex(data.value.series.length, options),
      data: Array.from<number>({ length: data.value.categories.length }).fill(
        0,
      ),
    })
    forEachTranslation((t) => {
      if (t.seriesNames) t.seriesNames.push('')
    })
  }

  function removeRow(index: number) {
    data.value.categories.splice(index, 1)
    for (const s of data.value.series) {
      s.data.splice(index, 1)
    }
    data.value.categoryColors.splice(index, 1)
    forEachTranslation((t) => {
      if (t.categories) t.categories.splice(index, 1)
    })
  }

  function removeSeries(index: number) {
    data.value.series.splice(index, 1)
    forEachTranslation((t) => {
      if (t.seriesNames) t.seriesNames.splice(index, 1)
    })
  }

  function importData(payload: {
    categories: string[]
    series: ChartSeries[]
    categoryColors: string[]
  }) {
    data.value.categories = payload.categories
    data.value.series = payload.series
    data.value.categoryColors = payload.categoryColors
    forEachTranslation((t) => {
      if (t.categories) {
        t.categories = Array.from<string>({
          length: payload.categories.length,
        }).fill('')
      }
      if (t.seriesNames) {
        t.seriesNames = Array.from<string>({
          length: payload.series.length,
        }).fill('')
      }
    })
  }

  function reverseRows() {
    data.value.categories = [...data.value.categories].reverse()
    data.value.categoryColors = [...data.value.categoryColors].reverse()
    data.value.series = data.value.series.map((s) => ({
      ...s,
      data: [...s.data].reverse(),
    }))
    forEachTranslation((t) => {
      if (t.categories) t.categories = [...t.categories].reverse()
    })
  }

  function addFootnote() {
    data.value.footnotes.push('')
    forEachTranslation((t) => {
      if (t.footnotes) t.footnotes.push('')
    })
  }

  function removeFootnote(index: number) {
    data.value.footnotes.splice(index, 1)
    forEachTranslation((t) => {
      if (t.footnotes) t.footnotes.splice(index, 1)
    })
  }

  function updateFootnote(index: number, value: string) {
    data.value.footnotes[index] = value
  }

  const typeOptionsByType: Partial<Record<ChartType, Record<string, unknown>>> =
    {}

  function setType(type: ChartType) {
    if (data.value.type === type) return
    if (data.value.typeOptions) {
      typeOptionsByType[data.value.type] = { ...data.value.typeOptions }
    }
    const defaults = getDefaultTypeOptions(type)
    const saved = typeOptionsByType[type] ?? {}
    const merged: Record<string, unknown> = {}
    for (const key of Object.keys(defaults)) {
      merged[key] = key in saved ? saved[key] : defaults[key]
    }
    data.value.type = type
    data.value.typeOptions = merged as BlokkliChartData['typeOptions']
  }

  return {
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
    reverseRows,
    addFootnote,
    removeFootnote,
    updateFootnote,
    setType,
  }
}
