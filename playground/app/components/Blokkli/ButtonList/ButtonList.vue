<template>
  <div class="min-h-[55px]">
    <BlokkliField name="blocks" :list="blocks" class="flex gap-10 flex-wrap" />
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import { defineBlokkli } from '#imports'

defineBlokkli({
  bundle: 'button_list',
  propsFieldMapping: {
    blocks: 'blocks',
  },
  editor: {
    disableEdit: true,
  },
})

export type Props = {
  blocks: FieldListItemTyped[]
}

defineProps<Props>()
</script>
