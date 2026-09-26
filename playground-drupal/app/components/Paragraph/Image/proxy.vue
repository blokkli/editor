<template>
  <img
    v-if="image?.derivative?.urlPath"
    v-blokkli-droppable:field_media
    :src="image.derivative.urlPath"
    :alt="image.alt ?? ''"
    class="size-24 object-cover"
  />
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import type { ParagraphImageFragment } from '#graphql-operations'

const props = defineProps<ParagraphImageFragment>()

const image = computed(() => props.media?.image)
</script>
