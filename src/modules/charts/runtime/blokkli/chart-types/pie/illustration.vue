<template>
  <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
    <path
      v-for="(s, i) in slices"
      :key="i"
      :d="`M 60 40 L ${s.start[0]} ${s.start[1]} A 28 28 0 0 1 ${s.end[0]} ${s.end[1]} Z`"
      :class="s.color"
    />
  </svg>
</template>

<script setup lang="ts">
import { tw } from '#blokkli/helpers/tw'

type Point = [number, number]

const slices: { start: Point; end: Point; color: string }[] = [
  { start: [88, 40], end: [55.1, 67.6], color: tw('fill-accent-500') },
  { start: [55.1, 67.6], end: [32, 40], color: tw('fill-accent-800') },
  { start: [32, 40], end: [60, 12], color: tw('fill-accent-300') },
  { start: [60, 12], end: [88, 40], color: tw('fill-accent-400') },
]
</script>
