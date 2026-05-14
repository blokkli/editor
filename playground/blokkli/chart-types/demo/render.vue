<template>
  <div
    style="
      padding: 16px;
      font-family: monospace;
      background: #f4f4f4;
      border: 1px dashed #888;
      border-radius: 6px;
    "
  >
    <strong>Demo chart-type</strong>
    <p>title: {{ title }}</p>
    <p>categories: {{ categories.join(', ') || '(none)' }}</p>
    <p v-if="(typeOptions as TypeOptions).showValues">
      values:
      {{
        (series[0]?.data ?? [])
          .map((v, i) => `${categories[i] ?? i}=${v}`)
          .join(', ') || '(none)'
      }}
    </p>
    <p>category colors: {{ categoryHexColors.join(', ') || '(none)' }}</p>
  </div>
</template>

<script setup lang="ts">
import type { ChartTypeRenderProps } from '#blokkli/charts/types'
import type { TypeOptions } from './definition'

defineProps<ChartTypeRenderProps>()
</script>
