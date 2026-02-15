<template>
  <Dropdown position="top-left">
    <template #button>
      <span
        class="bk-chart-color-swatch"
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
