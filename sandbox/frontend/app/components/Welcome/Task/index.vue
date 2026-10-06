<template>
  <article
    class="flex flex-col items-start gap-3 border border-line p-6"
    :class="label ? 'bg-surface' : 'bg-white'"
  >
    <p v-if="label" class="text-label text-primary uppercase">{{ label }}</p>
    <h3 class="text-h3">{{ title }}</h3>
    <p>{{ text }}</p>
    <ArrowLink v-if="url" :to="url" class="mt-auto pt-2">
      {{ linkLabel }}
    </ArrowLink>
  </article>
</template>

<script lang="ts" setup>
import { ArrowLink } from '#components'

// A task on the welcome page: what to try, and a link into the editor where
// it works. With a label and no link, a teaser (the agent outside premium
// sandboxes).
defineProps<{
  title: string
  text: string
  label?: string
  url?: string | null
  linkLabel?: string
}>()
</script>
