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
} from '#blokkli/types'
import { getParagraphComponent } from '#blokkli/imports'
import { INJECT_BLOCK_ITEM } from '../helpers/symbols'

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

provide<InjectedParagraphItem>(INJECT_BLOCK_ITEM, paragraphItem)
</script>
