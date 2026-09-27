<template>
  <div class="relative">
    <img
      v-if="image?.derivative?.urlPath"
      :src="image.derivative.urlPath"
      :width="image.derivative.width ?? undefined"
      :height="image.derivative.height ?? undefined"
      :alt="image.alt ?? ''"
      :class="imgClass"
      loading="lazy"
    />
    <span
      v-if="credit && !hideCredit"
      class="absolute right-0 bottom-0 bg-ink/60 px-2 py-0.5 text-smallall text-white"
    >
      {{ credit }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import type { MediaImageFragment } from '#graphql-operations'

withDefaults(
  defineProps<
    MediaImageFragment & {
      // Classes for the <img>; the component's own classes size the wrapper.
      imgClass?: string
      hideCredit?: boolean
    }
  >(),
  {
    imgClass: 'h-auto w-full',
  },
)
</script>
