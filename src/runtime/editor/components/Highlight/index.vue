<template>
  <Component :is="tag || 'div'" class="bk-highlight">
    <template v-for="(segment, i) in segments" :key="i">
      <em v-if="segment.match">{{ segment.text }}</em>
      <template v-else>{{ segment.text }}</template>
    </template>
  </Component>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { falsy } from '#blokkli/helpers'

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

type Segment = {
  text: string
  match: boolean
}

/**
 * Splits the text into runs of matched and unmatched characters.
 */
function segmentsFromPositions(text: string, positions: number[]): Segment[] {
  const matched = new Set(positions)
  const segments: Segment[] = []

  for (let i = 0; i < text.length; i++) {
    const match = matched.has(i)
    const last = segments.at(-1)
    if (last && last.match === match) {
      last.text += text[i]
    } else {
      segments.push({ text: text[i]!, match })
    }
  }

  return segments
}

/**
 * Splits the text at the regex's matches. A regex without the `g` flag
 * matches once.
 */
function segmentsFromRegex(text: string, regex: RegExp): Segment[] {
  const matches = regex.global
    ? [...text.matchAll(regex)]
    : [text.match(regex)].filter(falsy)
  const segments: Segment[] = []
  let cursor = 0

  for (const match of matches) {
    const index = match.index ?? 0
    if (!match[0]) {
      continue
    }
    if (index > cursor) {
      segments.push({ text: text.substring(cursor, index), match: false })
    }
    segments.push({ text: match[0], match: true })
    cursor = index + match[0].length
  }

  if (cursor < text.length) {
    segments.push({ text: text.substring(cursor), match: false })
  }

  return segments
}

const segments = computed<Segment[]>(() => {
  if (props.positions?.length) {
    return segmentsFromPositions(props.text, props.positions)
  }

  if (!props.regex) {
    return [{ text: props.text, match: false }]
  }

  const segments = segmentsFromRegex(props.text, props.regex)
  const first = segments.findIndex((v) => v.match)

  // If no match is found, return the original text.
  if (first === -1) {
    return [{ text: props.text, match: false }]
  }

  // Start with at most 30 characters before the first match.
  const before = segments[first - 1]
  if (!before) {
    return segments.slice(first)
  }

  return [
    { text: before.text.substring(before.text.length - 30), match: false },
    ...segments.slice(first),
  ]
})
</script>
