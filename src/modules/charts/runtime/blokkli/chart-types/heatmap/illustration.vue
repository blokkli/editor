<template>
  <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
    <g class="fill-accent-500">
      <template v-for="(row, ri) in rows" :key="ri">
        <rect
          v-for="(opacity, ci) in row"
          :key="ci"
          :x="13 + ci * 16"
          :y="9 + ri * 16"
          width="14"
          height="14"
          rx="1"
          :fill-opacity="opacity"
        />
      </template>
    </g>
  </svg>
</template>

<script setup lang="ts">
const rows: number[][] = [
  [0.2, 0.3, 0.5, 0.7, 0.9, 1],
  [0.3, 0.5, 0.7, 0.9, 1, 0.8],
  [0.2, 0.4, 0.6, 0.8, 0.6, 0.5],
  [0.15, 0.25, 0.4, 0.5, 0.4, 0.3],
]
</script>
