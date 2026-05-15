<template>
  <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
    <template v-for="row in rows" :key="row.y">
      <rect
        :x="60 - row.left"
        :y="row.y"
        :width="row.left"
        height="8"
        rx="1.5"
        class="fill-accent-500"
      />
      <rect
        x="61"
        :y="row.y"
        :width="row.right"
        height="8"
        rx="1.5"
        class="fill-accent-300"
      />
    </template>
    <line
      x1="60"
      y1="8"
      x2="60"
      y2="72"
      stroke-width="1.5"
      stroke-linecap="round"
      class="stroke-accent-900"
    />
  </svg>
</template>

<script setup lang="ts">
const rows: { y: number; left: number; right: number }[] = [
  { y: 11, left: 16, right: 14 },
  { y: 22, left: 22, right: 20 },
  { y: 33, left: 28, right: 26 },
  { y: 44, left: 34, right: 30 },
  { y: 55, left: 26, right: 24 },
]
</script>
