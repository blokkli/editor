<template>
  <div class="pb-paragraph-icon" v-if="markup" v-html="markup" />
  <div v-else-if="bundle === 'from_library'" class="pb-paragraph-icon">
    <Icon name="reusable" />
  </div>
  <div v-else class="pb-paragraph-icon">
    <Icon name="question" />
  </div>
</template>

<script lang="ts" setup>
import { icons } from '#nuxt-paragraphs-builder/definitions'
import { Icon } from '#pb/components'

const props = defineProps<{
  bundle?: string
}>()

const markup = computed(() => {
  return props.bundle ? icons[props.bundle] : undefined
})
</script>
