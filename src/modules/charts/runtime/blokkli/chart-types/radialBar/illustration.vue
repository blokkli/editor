<template>
  <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
    <circle
      v-for="r in [12, 20, 28]"
      :key="r"
      cx="60"
      cy="40"
      :r="r"
      fill="none"
      stroke-width="4"
      class="stroke-accent-200"
    />
    <path
      v-for="(a, i) in arcs"
      :key="i"
      :d="a.d"
      fill="none"
      stroke-width="4"
      stroke-linecap="round"
      :class="a.color"
    />
  </svg>
</template>

<script setup lang="ts">
import { tw } from '#blokkli/helpers/tw'

const arcs: { d: string; color: string }[] = [
  { d: 'M 60 28 A 12 12 0 1 1 48 40', color: tw('stroke-accent-800') },
  { d: 'M 60 20 A 20 20 0 0 1 60 60', color: tw('stroke-accent-500') },
  { d: 'M 60 12 A 28 28 0 0 1 88 40', color: tw('stroke-accent-300') },
]
</script>
