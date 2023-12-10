<template>
  <div>
    <h2>{{ title }}</h2>
  </div>
</template>

<script lang="ts" setup>
import type { FieldText } from '~/app/mock/state/Field'

defineBlokkli({
  bundle: 'title',
})

defineProps<{
  title: FieldText
  lead?: FieldText
}>()
</script>
