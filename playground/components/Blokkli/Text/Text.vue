<template>
  <div :class="{ 'container mx-auto': !parentType }">
    <div class="content" v-html="markup" />
  </div>
</template>

<script lang="ts" setup>
import type { FieldTextarea } from '~/app/mock/state/Field/Textarea'

const { parentType, options } = defineBlokkli({
  bundle: 'text',
  options: {
    list: {
      type: 'checkbox',
      label: 'List',
      default: '0',
    },
  },
})

const props = defineProps<{
  text: FieldTextarea
}>()

const markup = computed((v) => {
  const text = props.text.getText()
  if (options.value.list === '1') {
    return (
      '<ul>' +
      text
        .split('\n')
        .map((v) => `<li>${v}</li>`)
        .join('\n') +
      '</ul>'
    )
  }
  return text
})
</script>

<style lang="postcss">
.content {
  ul {
    li {
      @apply font-medium;
      &:before {
        content: '';
        @apply inline-block w-15 h-15 rounded-full bg-blue-700 mr-10;
      }
      &:not(:last-child) {
        @apply mb-10;
      }
    }
  }
}
</style>
