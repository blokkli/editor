<template>
  <div class="flex flex-col gap-3">
    <h2 class="border-b border-ink pb-2.5 text-label text-muted uppercase">
      {{ $texts('contact.label', 'Contact') }}
    </h2>
    <p class="font-serif text-h3 font-semibold">
      <a :href="url?.path" class="hover:text-primary hover:underline">
        {{ title }}
      </a>
    </p>
    <OfficeDetails v-bind="props" />
  </div>
</template>

<script lang="ts" setup>
import type { OfficeContactFragment } from '#graphql-operations'
import OfficeDetails from '~/components/Office/Details/index.vue'

// An office's contact in a sidebar: a heading, the office's name, the details.
// The contact block and the contact fragment.
const props = defineProps<
  OfficeContactFragment & {
    /** Only the phone and the email. */
    compact?: boolean
  }
>()
</script>
