<template>
  <li>
    <SiteLink
      :to="url"
      class="flex items-center gap-4 border-b border-line py-3.5 font-semibold text-ink hover:text-primary"
    >
      <SpriteSymbol
        v-if="download"
        name="download"
        class="size-5 shrink-0 text-primary"
      />
      <span class="grow">
        <slot>{{ label }}</slot>
      </span>
      <span v-if="meta" class="shrink-0 text-small font-normal text-muted">
        {{ meta }}
      </span>
      <SpriteSymbol
        v-else-if="!download"
        name="arrow-right"
        class="size-5 shrink-0 text-primary"
      />
    </SiteLink>
  </li>
</template>

<script lang="ts" setup>
import { SiteLink, SpriteSymbol } from '#components'

// A row of a link list: a download gets an icon before its label, a link an
// arrow after it (unless it has a meta text). The label can be a slot, e.g. to
// make it editable.
defineProps<{
  label?: string
  url?: string
  meta?: string
  download?: boolean
}>()
</script>
