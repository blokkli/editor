<template>
  <div class="bk-csv-preview-table-wrap">
    <table class="bk-csv-preview-table w-full text-sm border-collapse">
      <thead>
        <tr>
          <th class="bk-csv-preview-category-cell">
            {{ $t('categories', 'Categories') }}
          </th>
          <th
            v-for="(s, si) in visibleSeries"
            :key="s.name"
            draggable="true"
            class="cursor-move select-none"
            :class="{
              'bk-csv-preview-drag-over': dragOverIndex === si,
              'opacity-50': dragFromIndex === si,
            }"
            @dragstart="onDragStart(si, $event)"
            @dragover.prevent="onDragOver(si)"
            @dragleave="onDragLeave(si)"
            @drop.prevent="onDrop(si)"
            @dragend="onDragEnd"
          >
            <div class="flex items-center gap-5">
              <Icon
                name="bk_mdi_drag_pan"
                class="size-15 text-mono-400 shrink-0"
              />
              <span>{{ s.name }}</span>
            </div>
          </th>
          <th v-if="hiddenSeries > 0">…</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(cat, ri) in visibleCategories" :key="ri">
          <td class="bk-csv-preview-category-cell">{{ cat }}</td>
          <td v-for="s in visibleSeries" :key="s.name">
            {{ s.data[ri] ?? 0 }}
          </td>
          <td v-if="hiddenSeries > 0">…</td>
        </tr>
      </tbody>
    </table>
    <div v-if="hiddenRows > 0" class="bk-csv-preview-more">
      {{
        $t('chartsCsvMoreRows', '+ @count more rows').replace(
          '@count',
          String(hiddenRows),
        )
      }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { CsvImportPayload } from '../csvHelpers'

const ROW_LIMIT = 20
const COL_LIMIT = 12

const props = defineProps<{
  payload: CsvImportPayload
}>()

const emit = defineEmits<{
  move: [{ from: number; to: number }]
}>()

const { $t } = useBlokkli()

const visibleSeries = computed(() => props.payload.series.slice(0, COL_LIMIT))
const visibleCategories = computed(() =>
  props.payload.categories.slice(0, ROW_LIMIT),
)
const hiddenSeries = computed(() =>
  Math.max(0, props.payload.series.length - COL_LIMIT),
)
const hiddenRows = computed(() =>
  Math.max(0, props.payload.categories.length - ROW_LIMIT),
)

const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(idx: number, e: DragEvent) {
  dragFromIndex.value = idx
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
}

function onDragOver(idx: number) {
  if (dragFromIndex.value === null) return
  dragOverIndex.value = idx
}

function onDragLeave(idx: number) {
  if (dragOverIndex.value === idx) dragOverIndex.value = null
}

function onDrop(toIdx: number) {
  const from = dragFromIndex.value
  dragOverIndex.value = null
  dragFromIndex.value = null
  if (from === null || from === toIdx) return
  emit('move', { from, to: toIdx })
}

function onDragEnd() {
  dragOverIndex.value = null
  dragFromIndex.value = null
}
</script>

<style lang="postcss">
.bk-csv-preview-table {
  th,
  td {
    @apply border-b border-r border-mono-200 p-10 text-left align-top;
    &:last-child {
      @apply border-r-0;
    }
  }

  thead th {
    @apply bg-mono-50 font-semibold text-mono-800 border-b-mono-300;
  }

  thead th.bk-csv-preview-drag-over {
    @apply bg-accent-100 text-accent-900;
  }

  tbody tr:last-child td {
    @apply border-b-0;
  }

  .bk-csv-preview-category-cell {
    @apply bg-mono-50 font-semibold text-mono-800;
  }
}

.bk-csv-preview-more {
  @apply p-10 text-center text-mono-600 text-sm bg-mono-50 border-t border-mono-200;
}
</style>
