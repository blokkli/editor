<template>
  <Dropdown position="top-left" button-class="bk-chart-color-dropdown-button">
    <template #button>
      <span
        class="bk-chart-color-swatch bk-chart-data-table-input"
        :style="{ backgroundColor: displayColor }"
      />
    </template>
    <template #default="{ close }">
      <button
        v-for="(entry, id) in colors"
        :key="id"
        type="button"
        class="bk-chart-color-option"
        :class="{ 'is-active': colorId === id }"
        @click="
          () => {
            emit('select', id as string)
            close()
          }
        "
      >
        <span
          class="bk-chart-color-swatch"
          :style="{ backgroundColor: entry.color }"
        />
        <span>{{ entry.label }}</span>
      </button>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { ChartColor } from '../../../../types'
import { Dropdown } from '#blokkli/editor/components'

const props = defineProps<{
  colorId: string
  colors: Record<string, ChartColor>
}>()

const emit = defineEmits<{
  select: [colorId: string]
}>()

const displayColor = computed(() => {
  const entry = props.colors[props.colorId]
  if (entry) {
    return entry.color
  }
  const first = Object.values(props.colors)[0]
  return first?.color || '#888888'
})
</script>

<style>
.bk {
  .bk-chart-color-swatch {
    @apply rounded-full block border border-mono-300 size-20;
  }

  .bk-chart-color-dropdown-button {
    @apply size-40 flex items-center justify-center;
  }

  .bk-chart-color-option {
    @apply w-full flex items-center gap-8 px-10 py-8;
    @apply text-sm text-mono-700 text-left;
    @apply border-none bg-transparent cursor-pointer;
    @apply hover:bg-mono-100 hover:text-mono-950;
    @apply whitespace-nowrap leading-none;

    &.is-active {
      @apply bg-mono-100 font-semibold text-mono-950;
    }
  }
}
</style>
