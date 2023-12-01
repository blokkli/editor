<template>
  <div>
    <ScaleToFit v-if="mockProps && component">
      <Component :is="component" v-bind="mockProps" />
    </ScaleToFit>
    <div v-else v-html="data" />
  </div>
</template>

<script lang="ts" setup>
import { getParagraphComponent } from '#nuxt-paragraphs-builder/imports'
import { getDefinition } from '#nuxt-paragraphs-builder/definitions'
import { INJECT_BLOCK_ITEM } from '#pb/helpers/symbols'
import { ScaleToFit } from '#pb/components'

const props = defineProps<{
  targetBundle: string
  data: string
}>()

const mockProps = computed(() => {
  const definition = getDefinition(props.targetBundle)
  if (definition?.mockProps) {
    return definition.mockProps(props.data)
  }
})

const component = await getParagraphComponent(props.targetBundle)

const index = computed(() => 1)

const item = computed(() => {
  return {
    index,
    uuid: 'dummy',
    paragraphsBuilderOptions: {},
    isEditing: false,
    parentParagraphBundle: 'paragraph',
  }
})

provide(INJECT_BLOCK_ITEM, item)
</script>
