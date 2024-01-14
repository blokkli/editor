<template>
  <div>
    <ScaleToFit v-if="mockProps && component">
      <Component :is="component" v-bind="mockProps" />
    </ScaleToFit>
    <div v-else v-html="data" />
  </div>
</template>

<script lang="ts" setup>
import { computed, provide } from '#imports'

import { getBlokkliItemComponent } from '#blokkli/imports'
import { getDefinition } from '#blokkli/definitions'
import { INJECT_BLOCK_ITEM } from '#blokkli/helpers/symbols'
import { ScaleToFit } from '#blokkli/components'

const props = defineProps<{
  targetBundle: string
  data: string
}>()

const mockProps = computed(() => {
  const definition = getDefinition(props.targetBundle)
  if (definition?.editor?.mockProps) {
    return definition.editor.mockProps(props.data)
  }
})

const component = await getBlokkliItemComponent(props.targetBundle)

const index = computed(() => 1)

const item = computed(() => {
  return {
    index,
    uuid: 'dummy',
    options: {},
    isEditing: false,
    // Non-nested items may render with a section/container, which is why we "
    // fake" the item to be nested.
    parentType: 'dummy-value',
  }
})

provide(INJECT_BLOCK_ITEM, item)
</script>
