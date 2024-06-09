<template>
  <div>
    <BlokkliField name="blocks" :list="blocks" class="flex gap-10 flex-wrap" />
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli/generated-types'
import { defineBlokkli } from '#imports'

defineBlokkli({
  bundle: 'button_list',
})

defineProps<{
  blocks: FieldListItemTyped[]
}>()
</script>

<style></style>
