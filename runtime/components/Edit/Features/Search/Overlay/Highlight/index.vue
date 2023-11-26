<template>
  <component :is="tag || 'div'" class="pb-highlight" v-html="markup" />
</template>

<script lang="ts" setup>
const props = defineProps<{
  /**
   * The text to find the matches in.
   */
  text: string

  /**
   * The regex to use for matching words.
   */
  regex?: RegExp

  /**
   * The tag for the wrapper.
   */
  tag?: string
}>()

const markup = computed(() => {
  if (!props.regex) {
    return props.text
  }

  // Find the first occurrence index of any word.
  const firstMatch = props.text.match(props.regex)
  const index = firstMatch
    ? props.text.toLowerCase().indexOf(firstMatch[0].toLowerCase())
    : -1

  // If no match is found, return the original text.
  if (index === -1) {
    return props.text
  }

  // Extract the part of the text before the first match.
  const before = props.text.substring(Math.max(0, index - 30), index)

  // Replace each occurrence with the highlighted version.
  const highlighted = props.text
    .substring(index)
    .replace(props.regex, (match) => {
      return `<em data-match="${match}">${match}</em>`
    })

  return before + highlighted
})
</script>
