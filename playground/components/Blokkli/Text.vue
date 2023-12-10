<template>
  <div v-html="markup" />
</template>

<script lang="ts" setup>
import type { FieldText } from '~/app/mock/state/Field'

defineBlokkli({
  bundle: 'text',
})

const props = defineProps<{
  text: FieldText
}>()

const markup = computed((v) => props.text.getText())
</script>
