<template>
  <div class="pb-highlight" v-html="markup" />
</template>

<script lang="ts" setup>
const props = defineProps<{
  text: string
  search: string
}>()

const markup = computed(() => {
  if (!props.search) {
    return props.text
  }
  const index = props.text.toLowerCase().indexOf(props.search.toLowerCase())
  if (index === -1) {
    return props.text
  }
  return (
    props.text.substring(index - 20, index) +
    '<em>' +
    props.text.substring(index, index + props.search.length) +
    '</em>' +
    props.text.substring(index + props.search.length)
  )
})
</script>
