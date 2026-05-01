<template>
  <table
    class="bk-chart-data-table border-collapse w-full"
    @keydown="onTableKeydown"
    @input="onTableInput"
    @click="onTableClick"
  >
    <thead v-if="hasMultipleSeries">
      <tr>
        <th />
        <th v-for="(s, si) in visibleSeries" :key="si">
          <div class="bk-chart-data-table-series-header">
            <ColorDropdown
              v-if="hasSeriesColors"
              :color-id="s.color"
              @select="updateSeriesColor(si, $event)"
            />
            <input
              type="text"
              :value="s.name"
              class="bk-chart-data-table-series-name bk-chart-data-table-input"
              @change="
                updateSeriesName(si, ($event.target as HTMLInputElement).value)
              "
            />
            <button
              v-if="series.length > 1"
              type="button"
              class="bk-chart-data-table-remove bk-chart-data-table-input"
              @click="props.removeSeries(si)"
            >
              <Icon name="bk_mdi_delete" />
            </button>
          </div>
        </th>
        <th v-if="canDeleteRows" />
      </tr>
    </thead>
    <tbody>
      <tr v-for="(cat, ci) in categories" :key="ci">
        <td>
          <div class="bk-chart-data-table-category-cell">
            <ColorDropdown
              v-if="hasCategoryColors"
              :color-id="categoryColors[ci] || ''"
              @select="updateCategoryColor(ci, $event)"
            />
            <input
              type="text"
              class="bk-chart-data-table-input font-semibold"
              :class="{
                'pl-0': hasCategoryColors,
              }"
              :value="cat"
              @change="
                updateCategory(ci, ($event.target as HTMLInputElement).value)
              "
            />
          </div>
        </td>
        <td v-for="(s, si) in visibleSeries" :key="si">
          <input
            type="text"
            inputmode="decimal"
            class="bk-chart-data-table-input"
            :value="s.data[ci]"
            @blur="
              updateValue(si, ci, ($event.target as HTMLInputElement).value)
            "
          />
        </td>
        <td v-if="canDeleteRows">
          <button
            type="button"
            class="bk-chart-data-table-remove bk-chart-data-table-input"
            @click="props.removeRow(ci)"
          >
            <Icon name="bk_mdi_delete" />
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed, ref } from '#imports'
import type { ChartSeries } from '../../../../types'
import { parseNumericInput } from '../../../../helpers'
import { Icon } from '#blokkli/editor/components'
import ColorDropdown from '../ColorDropdown/index.vue'

const props = defineProps<{
  categories: string[]
  series: ChartSeries[]
  categoryColors: string[]
  hasMultipleSeries: boolean
  hasSeriesColors: boolean
  hasCategoryColors: boolean
  removeRow: (index: number) => void
  removeSeries: (index: number) => void
}>()

const emit = defineEmits<{
  'update:categories': [value: string[]]
  'update:series': [value: ChartSeries[]]
  'update:categoryColors': [value: string[]]
}>()

const visibleSeries = computed(() =>
  props.hasMultipleSeries ? props.series : props.series.slice(0, 1),
)

const canDeleteRows = computed(() => props.categories.length > 1)

function updateCategory(index: number, value: string) {
  if (props.categories[index] === value) return
  const updated = [...props.categories]
  updated[index] = value
  emit('update:categories', updated)
}

function updateValue(seriesIndex: number, categoryIndex: number, raw: string) {
  const value = parseNumericInput(raw)
  if (props.series[seriesIndex]?.data[categoryIndex] === value) return
  const updated = props.series.map((s, si) => {
    if (si !== seriesIndex) return s
    const data = [...s.data]
    data[categoryIndex] = value
    return { ...s, data }
  })
  emit('update:series', updated)
}

function updateSeriesName(index: number, name: string) {
  emit(
    'update:series',
    props.series.map((s, i) => (i === index ? { ...s, name } : s)),
  )
}

function updateSeriesColor(index: number, colorId: string) {
  emit(
    'update:series',
    props.series.map((s, i) => (i === index ? { ...s, color: colorId } : s)),
  )
}

function updateCategoryColor(index: number, colorId: string) {
  const updated = [...props.categoryColors]
  updated[index] = colorId
  emit('update:categoryColors', updated)
}

const editing = ref(false)

function onTableInput(e: Event) {
  if (e.target instanceof HTMLInputElement) {
    editing.value = true
  }
}

function onTableClick(e: MouseEvent) {
  if (e.target instanceof HTMLInputElement) {
    editing.value = true
  }
}

function onTableKeydown(e: KeyboardEvent) {
  const { key } = e
  if (
    key !== 'ArrowUp' &&
    key !== 'ArrowDown' &&
    key !== 'ArrowLeft' &&
    key !== 'ArrowRight' &&
    key !== 'Enter' &&
    key !== 'F2' &&
    key !== 'Escape'
  ) {
    return
  }

  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return

  // F2: enter edit mode on a focused input.
  if (key === 'F2' && active instanceof HTMLInputElement) {
    editing.value = true
    const len = active.value.length
    active.setSelectionRange(len, len)
    e.preventDefault()
    return
  }

  // Escape: exit edit mode, re-select all text, stay on same cell.
  if (key === 'Escape' && active instanceof HTMLInputElement) {
    editing.value = false
    active.select()
    e.preventDefault()
    return
  }

  // Enter on a button: ignore (let the button handle it).
  if (key === 'Enter' && !(active instanceof HTMLInputElement)) return

  // Enter in navigation mode: enter edit mode (place cursor at end).
  if (key === 'Enter' && !editing.value && !e.shiftKey) {
    editing.value = true
    const input = active as HTMLInputElement
    const len = input.value.length
    input.setSelectionRange(len, len)
    e.preventDefault()
    return
  }

  // Only handle focusable elements inside the table.
  const table = active.closest('table')
  if (!table) return

  // In edit mode, let arrow keys move the cursor within the input,
  // but navigate between cells at cursor boundaries.
  if (editing.value && active instanceof HTMLInputElement) {
    const atStart = active.selectionStart === 0 && active.selectionEnd === 0
    const atEnd =
      active.selectionEnd === active.value.length &&
      active.selectionStart === active.selectionEnd

    if (key === 'ArrowLeft' && !atStart) return
    if (key === 'ArrowRight' && !atEnd) return
    if (key === 'ArrowUp' || key === 'ArrowDown') return
  }

  const cellSelector = 'input, button'
  // Collect rows from thead and tbody (skip tfoot).
  const rows = Array.from(
    table.querySelectorAll<HTMLTableRowElement>('thead > tr, tbody > tr'),
  )
  let currentRow = -1
  let currentCol = -1

  for (let r = 0; r < rows.length; r++) {
    const cells = Array.from(
      rows[r]!.querySelectorAll<HTMLElement>(cellSelector),
    )
    const col = cells.indexOf(active)
    if (col !== -1) {
      currentRow = r
      currentCol = col
      break
    }
  }

  if (currentRow === -1) return

  let targetRow = currentRow
  let targetCol = currentCol

  if (key === 'ArrowUp' || (key === 'Enter' && e.shiftKey)) targetRow--
  else if (key === 'ArrowDown' || (key === 'Enter' && !e.shiftKey)) targetRow++
  else if (key === 'ArrowLeft') targetCol--
  else if (key === 'ArrowRight') targetCol++

  if (targetRow < 0 || targetRow >= rows.length) return

  const targetCells = Array.from(
    rows[targetRow]!.querySelectorAll<HTMLElement>(cellSelector),
  )
  if (targetCol < 0 || targetCol >= targetCells.length) return

  e.preventDefault()
  editing.value = false
  const target = targetCells[targetCol]!
  target.focus()
  if (target instanceof HTMLInputElement) {
    target.select()
  }
}
</script>
