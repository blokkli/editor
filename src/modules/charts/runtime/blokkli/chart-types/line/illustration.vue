<template>
  <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
    <polyline
      :points="toPoints(secondary)"
      fill="none"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="stroke-accent-300"
    />
    <polyline
      :points="toPoints(primary)"
      fill="none"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="stroke-accent-500"
    />
    <circle
      v-for="([cx, cy], i) in primary"
      :key="i"
      :cx="cx"
      :cy="cy"
      r="2.5"
      class="fill-accent-500"
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
type Point = [number, number]

const primary: Point[] = [
  [15, 42],
  [33, 22],
  [51, 35],
  [69, 15],
  [87, 30],
  [105, 12],
]

const secondary: Point[] = [
  [15, 52],
  [33, 45],
  [51, 50],
  [69, 40],
  [87, 46],
  [105, 38],
]

function toPoints(points: Point[]): string {
  return points.map((p) => p.join(',')).join(' ')
}
</script>
