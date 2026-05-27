<template>
  <div
    v-if="deleted"
    class="bk-avatar-deleted shrink-0 rounded flex items-center justify-center size-(--bk-avatar-size) border border-mono-300 bg-mono-100 text-mono-400 relative"
    data-test="avatar-deleted"
    :title="name"
  >
    <Icon name="ghost" />
  </div>
  <div
    v-else-if="showImage"
    class="shrink-0 rounded size-(--bk-avatar-size) bk-avatar-image overflow-hidden relative"
  >
    <img
      :src="imageUrl!"
      :alt="name"
      :title="name"
      class="object-cover size-full block"
      @error="imageFailed = true"
    />
  </div>
  <div
    v-else
    class="shrink-0 rounded flex items-center justify-center font-semibold select-none size-(--bk-avatar-size) text-[calc(var(--bk-avatar-size)/2.25)] border relative"
    :class="colorClass"
    :title="name"
  >
    <span>{{ initials }}</span>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from '#imports'
import { tw } from '#blokkli/helpers/tw'
import Icon from '#blokkli/editor/components/Icon/index.vue'

const props = withDefaults(
  defineProps<{
    name: string
    seed?: string
    size?: 'sm' | 'md'
    imageUrl?: string | null
    /**
     * Render a neutral "deleted user" placeholder (ghost icon) instead of an
     * image or initials. Use when the author is unknown — e.g. an anonymous
     * comment or a since-deleted account.
     */
    deleted?: boolean
  }>(),
  {
    seed: undefined,
    size: 'md',
    imageUrl: null,
    deleted: false,
  },
)

function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const PALETTE = [
  tw('bg-accent-950 text-white border-current'),
  tw('bg-accent-700 text-white border-current'),
  tw('bg-accent-500 text-white border-current'),
  tw('bg-accent-300 text-accent-700 border-accent-300'),
  tw('bg-accent-100 text-accent-900 border-accent-300'),
  tw('bg-teal-dark text-white border-teal-dark'),
  tw('bg-orange-dark text-white border-orange-dark'),
  tw('bg-yellow-dark text-white border-yellow-dark'),
  tw('bg-red-dark text-white border-red-dark'),
  tw('bg-lime-dark text-white border-lime-dark'),
  tw('bg-yellow-light text-yellow-dark border-yellow-normal/50'),
  tw('bg-yellow-normal text-yellow-dark border-yellow-dark/20'),
  tw('bg-teal-light text-teal-dark border-teal-normal/50'),
  tw('bg-teal-normal text-white'),
  tw('bg-orange-light text-orange-dark border-orange-normal/40'),
  tw('bg-orange-normal text-orange-light'),
  tw('bg-red-light text-red-dark border-red-normal/30'),
  tw('bg-red-normal text-red-light'),
  tw('bg-lime-light text-lime-dark border-lime-normal/50'),
  tw('bg-lime-normal text-lime-light border-lime-dark/50'),
]

const imageFailed = ref(false)

// Reset failure flag when the URL changes so a new user/url gets a fresh try.
watch(
  () => props.imageUrl,
  () => {
    imageFailed.value = false
  },
)

const showImage = computed(() => !!props.imageUrl && !imageFailed.value)

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
  return PALETTE[hash(props.seed || props.name || '') % PALETTE.length]
})
</script>

<script lang="ts">
export default {
  name: 'Avatar',
}
</script>

<style lang="postcss">
.bk-avatar-image {
  &:before {
    content: '';
    @apply absolute top-0 left-0 rounded border border-mono-800 size-full opacity-30;
  }
}

.bk-avatar-deleted svg {
  @apply size-[calc(var(--bk-avatar-size)*0.6)];
}
</style>
