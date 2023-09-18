<template>
  <component :is="component" v-bind="paragraph" />
</template>

<script lang="ts">
export default {
  name: 'PbItem',
}
</script>

<script lang="ts" setup>
import type {
  InjectedParagraphItem,
  PbFieldItemParagraphFragment,
} from './../types'
import { getParagraphComponent } from '#nuxt-paragraphs-builder/imports'

const props = withDefaults(
  defineProps<{
    item: PbFieldItemParagraphFragment
    paragraph: any
    index?: number
    parentParagraphBundle?: string
    isEditing?: boolean
  }>(),
  {
    index: 0,
    isEditing: false,
  },
)

const component = await getParagraphComponent(props.item.entityBundle)

const index = computed(() => {
  return props.index || 0
})

const paragraphItem = computed(() => {
  return {
    index,
    uuid: props.item.uuid || '',
    paragraphsBuilderOptions: ('paragraphsBuilderOptions' in props.item
      ? props.item.paragraphsBuilderOptions
      : {}) as any,
    isEditing: props.isEditing,
    parentParagraphBundle: props.parentParagraphBundle,
  }
})

provide<InjectedParagraphItem>('paragraphItem', paragraphItem)
</script>
