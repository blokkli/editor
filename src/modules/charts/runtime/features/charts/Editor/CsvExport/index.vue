<template>
  <PanelAction
    :title="$t('chartsExportCsv', 'Export CSV')"
    icon="bk_mdi_download"
    @click="exportCsv"
  />
</template>

<script setup lang="ts">
import PanelAction from '#blokkli/editor/components/Panel/Action/index.vue'
import { useBlokkli } from '#imports'
import type { ChartSeries } from '../../../../types'

const props = defineProps<{
  title: string
  categories: string[]
  series: ChartSeries[]
}>()

const { $t } = useBlokkli()

function escapeCell(value: string): string {
  if (/[",\n;\t]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildCsv(): string {
  const header = ['', ...props.series.map((s) => s.name)]
  const lines = [header.map(escapeCell).join(',')]

  for (let ci = 0; ci < props.categories.length; ci++) {
    const row = [props.categories[ci] || '']
    for (const s of props.series) {
      const value = s.data[ci]
      row.push(
        typeof value === 'number' && Number.isFinite(value)
          ? String(value)
          : '',
      )
    }
    lines.push(row.map(escapeCell).join(','))
  }

  return lines.join('\n') + '\n'
}

function buildFilename(): string {
  const base = (props.title || 'chart')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'chart'}.csv`
}

function exportCsv() {
  const csv = buildCsv()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = buildFilename()
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>
