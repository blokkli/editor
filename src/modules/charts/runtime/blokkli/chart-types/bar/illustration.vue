<template>
  <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
    <rect
      v-for="(b, i) in bars"
      :key="i"
      :x="b.x"
      :y="b.y"
      width="10"
      :height="65 - b.y"
      rx="1.5"
      :class="b.light ? 'fill-accent-300' : 'fill-accent-500'"
    />
    <line
      x1="10"
      y1="65"
      x2="110"
      y2="65"
      stroke-width="1.5"
      stroke-linecap="round"
      class="stroke-accent-900"
    />
  </svg>
</template>

<script setup lang="ts">
const bars: { x: number; y: number; light: boolean }[] = [
  { x: 18, y: 42, light: false },
  { x: 29, y: 32, light: true },
  { x: 48, y: 25, light: false },
  { x: 59, y: 40, light: true },
  { x: 78, y: 38, light: false },
  { x: 89, y: 18, light: true },
]
</script>
