<template>
  <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
    <polygon
      :points="toPoints(innerGrid)"
      fill="none"
      stroke-width="1"
      class="stroke-accent-200"
    />
    <polygon
      :points="toPoints(outerGrid)"
      fill="none"
      stroke-width="1.5"
      class="stroke-accent-400"
    />
    <line
      v-for="([x, y], i) in outerGrid"
      :key="i"
      x1="60"
      y1="40"
      :x2="x"
      :y2="y"
      stroke-width="1"
      class="stroke-accent-300"
    />
    <polygon
      :points="toPoints(data)"
      fill-opacity="0.45"
      stroke-width="2"
      stroke-linejoin="round"
      class="fill-accent-500 stroke-accent-800"
    />
  </svg>
</template>

<script setup lang="ts">
type Point = [number, number]

const outerGrid: Point[] = [
  [60, 12],
  [86.6, 31.35],
  [76.5, 62.65],
  [43.5, 62.65],
  [33.4, 31.35],
]

const innerGrid: Point[] = [
  [60, 26],
  [78.6, 32.8],
  [71.5, 53.2],
  [48.5, 53.2],
  [41.4, 32.8],
]

const data: Point[] = [
  [60, 18],
  [77.1, 34.4],
  [74.1, 59.4],
  [52.9, 49.7],
  [41.0, 33.8],
]

function toPoints(points: Point[]): string {
  return points.map((p) => p.join(',')).join(' ')
}
</script>
