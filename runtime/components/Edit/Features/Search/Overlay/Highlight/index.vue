<template>
  <component :is="tag || 'div'" class="pb-highlight" v-html="markup" />
</template>

<script lang="ts" setup>
const props = defineProps<{
  text: string
  search: string
  tag?: string
}>()

const markup = computed(() => {
  if (!props.search) {
    return props.text
  }
  const index = props.text.toLowerCase().indexOf(props.search.toLowerCase())
  if (index === -1) {
    return props.text
  }

  // Extract the part of the text before the first match
  const before = props.text.substring(Math.max(0, index - 30), index)

  // Create a regular expression to find all occurrences of the search string
  // 'gi' flags for global and case-insensitive search
  const regex = new RegExp(props.search, 'gi')

  // Replace each occurrence with the highlighted version
  const highlighted = props.text.substring(index).replace(regex, (match) => {
    return `<em data-match="${match}">${match}</em>`
  })

  return before + highlighted
})
</script>
