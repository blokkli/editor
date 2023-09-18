<template>
  <div class="pb-paragraph-icon" v-if="markup" v-html="markup" />
  <div v-else class="pb-paragraph-icon">
    <IconQuestion />
  </div>
</template>

<script lang="ts" setup>
import { icons } from '#nuxt-paragraphs-builder/definitions'
import IconQuestion from './../Icons/Question.vue'

const props = defineProps<{
  bundle?: string
}>()

const markup = computed(() => {
  return props.bundle ? icons[props.bundle] : undefined
})
</script>
