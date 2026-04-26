<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
    <circle
      v-if="dataWithValues.length === 1"
      :cx="radius"
      :cy="radius"
      :r="radius"
      :fill="dataWithValues[0]?.color"
    />
    <g v-else :transform="`translate(${radius}, ${radius})`">
      <path
        v-for="(segment, index) in segments"
        :key="index"
        :d="segment.path"
        :fill="segment.color"
        stroke-width="2"
        stroke="white"
      />
    </g>
    <circle :cx="radius" :cy="radius" :r="radius - thickness" fill="white" />
    <text
      v-if="percentage !== undefined"
      x="50%"
      y="50%"
      dominant-baseline="middle"
      text-anchor="middle"
      fill="currentColor"
      class="font-bold text-lime-normal"
    >
      {{ percentage }}%
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from '#imports'

interface DataItem {
  label: string
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{
    data: DataItem[]
    radius?: number
    thickness?: number
    percentage?: number
  }>(),
  {
    radius: 34,
    thickness: 10,
    percentage: undefined,
  },
)

const size = computed(() => props.radius * 2)

const dataWithValues = computed(() =>
  props.data.filter((item) => item.value > 0),
)

const segments = computed(() => {
  const total = props.data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return []

  let currentAngle = -90

  return props.data
    .filter((item) => item.value > 0)
    .map((item) => {
      const percentage = item.value / total
      const angle = percentage * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle

      // Calculate path for the segment
      const path = createPieSegment(
        0,
        0, // center x, y
        props.radius,
        startAngle,
        endAngle,
      )

      currentAngle = endAngle

      return {
        path,
        color: item.color,
        label: item.label,
        value: item.value,
        percentage,
      }
    })
})

function createPieSegment(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  // Convert angles to radians
  const start = (startAngle * Math.PI) / 180
  const end = (endAngle * Math.PI) / 180

  // Calculate arc points
  const x1 = cx + radius * Math.cos(start)
  const y1 = cy + radius * Math.sin(start)
  const x2 = cx + radius * Math.cos(end)
  const y2 = cy + radius * Math.sin(end)

  // Determine if we need a large arc (> 180 degrees)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  // Special case for full circle
  if (endAngle - startAngle >= 360) {
    return `
        M ${cx} ${cy}
        L ${cx + radius} ${cy}
        A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy + 0.001}
        Z
      `
  }

  // Create the path
  return `
      M ${cx} ${cy}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      Z
    `
}
</script>
