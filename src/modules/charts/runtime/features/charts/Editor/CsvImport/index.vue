<template>
  <input
    ref="fileInputEl"
    type="file"
    accept=".csv,text/csv"
    class="bk-chart-data-table-file-input"
    @change="onFileChange"
  />
  <PanelAction
    :title="$t('chartsImportCsv', 'Import CSV')"
    icon="bk_mdi_csv"
    @click="fileInputEl?.click()"
  />
</template>

<script setup lang="ts">
import PanelAction from '#blokkli/editor/components/Panel/Action/index.vue'
import { useTemplateRef, useBlokkli } from '#imports'
import type { ChartSeries } from '../../../../types'
import { getColorIdAtIndex, parseNumericInput } from '../../../../helpers'

const emit = defineEmits<{
  import: [
    payload: {
      categories: string[]
      series: ChartSeries[]
      categoryColors: string[]
    },
  ]
}>()

const { $t, config } = useBlokkli()
const fileInputEl = useTemplateRef<HTMLInputElement>('fileInputEl')

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',' || char === ';' || char === '\t') {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result
    if (typeof text !== 'string') return

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length < 2) return

    const header = parseCsvLine(lines[0]!)
    // First column is categories, rest are series.
    const seriesNames = header.slice(1)
    if (seriesNames.length === 0) return

    const categories: string[] = []
    const seriesData: number[][] = seriesNames.map(() => [])

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]!)
      categories.push(cells[0] || `Category ${i}`)
      for (let si = 0; si < seriesNames.length; si++) {
        seriesData[si]!.push(parseNumericInput(cells[si + 1] || ''))
      }
    }

    const options = config.colorOptions.value
    const series = seriesNames.map((name, i) => ({
      name: name || `Series ${i + 1}`,
      color: getColorIdAtIndex(i, options),
      data: seriesData[i]!,
    }))

    const categoryColors = categories.map((_, i) =>
      getColorIdAtIndex(i, options),
    )

    emit('import', { categories, series, categoryColors })
  }
  reader.readAsText(file)

  // Reset so the same file can be re-selected.
  input.value = ''
}
</script>
