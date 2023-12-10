<template>
  <div class="block-grid">
    <BlokkliField v-bind="fieldBlocks" />
  </div>
</template>

<script lang="ts" setup>
import { mapMockField } from '~/app/mock/state'
import type { FieldBlocks } from '~/app/mock/state/Field'

defineBlokkli({
  bundle: 'grid',
})

const props = defineProps<{
  blocks: FieldBlocks
}>()

const fieldBlocks = computed(() => {
  return mapMockField(props.blocks)
})
</script>

<style>
.block-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 1rem;
}
</style>
