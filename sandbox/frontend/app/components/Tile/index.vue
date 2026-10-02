<template>
  <span
    class="flex size-12 shrink-0 flex-col items-center justify-center"
    :class="TONES[tone]"
    aria-hidden="true"
  >
    <slot />
  </span>
</template>

<script lang="ts" setup>
// The square at the start of a row: a step's number, an event's date, a
// publication's icon. One size, so rows line up across lists. Decorative: the
// row says the same in words, or the list numbers its items.
defineProps<{
  tone: 'primary' | 'light' | 'surface'
}>()

const TONES = {
  primary: 'bg-primary text-white',
  light: 'bg-primary-light text-primary-dark',
  surface: 'bg-surface text-primary',
} as const
</script>
