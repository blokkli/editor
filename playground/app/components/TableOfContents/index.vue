<template>
  <div class="container">
    <ul>
      <li v-for="item in links" :key="item.id">
        {{ item.label }}
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import type { BlokkliTableOfContentsLink } from '#blokkli/table-of-contents'

defineProps<{
  links: BlokkliTableOfContentsLink[]
}>()
</script>
