<template>
  <div
    class="shrink-0 rounded flex items-center justify-center font-semibold select-none size-(--bk-comment-avatar-size) text-[calc(var(--bk-comment-avatar-size)/2.5)]"
    :class="colorClass"
    :title="name"
  >
    {{ initials }}
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { tw } from '#blokkli/helpers/tw'

const props = withDefaults(
  defineProps<{
    name: string
    seed?: string
    size?: 'sm' | 'md'
  }>(),
  {
    seed: undefined,
    size: 'md',
  },
)

const PALETTE = [
  tw('bg-accent-600 text-white'),
  tw('bg-accent-100 text-accent-700'),
  tw('bg-teal-dark text-white'),
  tw('bg-orange-dark text-white'),
  tw('bg-yellow-dark text-white'),
  tw('bg-red-dark text-white'),
  tw('bg-lime-dark text-white'),
]

const initials = computed(() => {
  const name = (props.name || '').trim()
  if (!name) {
    return '?'
  }
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0]! + words[1][0]!).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

const colorClass = computed(() => {
  const seed = props.seed || props.name || ''
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(h) % PALETTE.length]
})
</script>

<script lang="ts">
export default {
  name: 'CommentAvatar',
}
</script>
