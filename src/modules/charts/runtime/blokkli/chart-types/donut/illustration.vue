<template>
  <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
    <path
      v-for="(s, i) in slices"
      :key="i"
      :d="donutPath(s.start, s.end)"
      :class="s.color"
    />
  </svg>
</template>

<script setup lang="ts">
import { tw } from '#blokkli/helpers/tw'

const CX = 60
const CY = 40
const OUTER_R = 28
const INNER_R = 13

const slices: { start: number; end: number; color: string }[] = [
  { start: 0, end: 100, color: tw('fill-accent-500') },
  { start: 100, end: 180, color: tw('fill-accent-800') },
  { start: 180, end: 270, color: tw('fill-accent-300') },
  { start: 270, end: 360, color: tw('fill-accent-400') },
]

function polar(r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

function donutPath(start: number, end: number): string {
  const [ox1, oy1] = polar(OUTER_R, start)
  const [ox2, oy2] = polar(OUTER_R, end)
  const [ix1, iy1] = polar(INNER_R, end)
  const [ix2, iy2] = polar(INNER_R, start)
  return `M ${ox1} ${oy1} A ${OUTER_R} ${OUTER_R} 0 0 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${INNER_R} ${INNER_R} 0 0 0 ${ix2} ${iy2} Z`
}
</script>
