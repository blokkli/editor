<template>
  <Component :is="tag || 'div'" class="bk-highlight" v-html="markup" />
</template>

<script lang="ts" setup>
import { computed } from '#imports'

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
   * The indices of the matches.
   */
  positions?: number[]

  /**
   * The tag for the wrapper.
   */
  tag?: string
}>()

const highlightPositions = (text: string, positions: number[]): string => {
  let result = ''
  let inTag = false // Flag to indicate if we are currently adding text inside <em></em>.

  for (let i = 0; i < text.length; i++) {
    // Check if the current character's index is in the positions array.
    if (positions.includes(i)) {
      // If the previous character was not a match, we start a new <em>.
      if (!inTag) {
        result += '<em>'
        inTag = true
      }
      result += text[i]
    } else {
      // If the previous character was a match, we close the <em> tag.
      if (inTag) {
        result += '</em>'
        inTag = false
      }
      result += text[i]
    }
  }

  // Close the <em> tag if the last character in text was a match.
  if (inTag) {
    result += '</em>'
  }

  return result
}

const markup = computed(() => {
  if (props.positions?.length) {
    return highlightPositions(props.text, props.positions)
  }

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
      return `<em>${match}</em>`
    })

  return before + highlighted
})
</script>
