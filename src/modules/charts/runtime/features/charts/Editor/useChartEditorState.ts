import { ref, watch, nextTick, computed } from '#imports'
import type { BlokkliChartData, ChartColor, ChartSeries } from '../../../types'
import { getColorIdAtIndex } from '../../../types'

const MAX_HISTORY = 50

function clone(v: BlokkliChartData): BlokkliChartData {
  return JSON.parse(JSON.stringify(v))
}

export function useChartEditorState(
  initial: BlokkliChartData,
  colors: Record<string, ChartColor>,
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

  function addRow() {
    data.value.categories.push(`Category ${data.value.categories.length + 1}`)
    for (const s of data.value.series) {
      s.data.push(0)
    }
    data.value.categoryColors.push(
      getColorIdAtIndex(data.value.categoryColors.length, colors),
    )
  }

  function addSeries() {
    data.value.series.push({
      name: `Series ${data.value.series.length + 1}`,
      color: getColorIdAtIndex(data.value.series.length, colors),
      data: Array.from<number>({ length: data.value.categories.length }).fill(
        0,
      ),
    })
  }

  function removeRow(index: number) {
    data.value.categories.splice(index, 1)
    for (const s of data.value.series) {
      s.data.splice(index, 1)
    }
    data.value.categoryColors.splice(index, 1)
  }

  function removeSeries(index: number) {
    data.value.series.splice(index, 1)
  }

  function importData(payload: {
    categories: string[]
    series: ChartSeries[]
    categoryColors: string[]
  }) {
    data.value.categories = payload.categories
    data.value.series = payload.series
    data.value.categoryColors = payload.categoryColors
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
  }
}
