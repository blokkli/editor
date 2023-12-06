<template>
  <component :is="component" v-bind="props" />
</template>

<script lang="ts" setup>
import type { InjectedBlokkliItem, BlokkliFieldListItem } from '#blokkli/types'
import { getBlokkliItemComponent } from '#blokkli/imports'
import { INJECT_BLOCK_ITEM } from '../helpers/symbols'

const componentProps = withDefaults(
  defineProps<{
    item: BlokkliFieldListItem
    props: any
    index?: number
    parentType?: string
    isEditing?: boolean
  }>(),
  {
    index: 0,
    isEditing: false,
  },
)

const component = await getBlokkliItemComponent(
  componentProps.item.entityBundle,
)

const index = computed(() => componentProps.index)

const item = computed(() => {
  return {
    index,
    uuid: componentProps.item.uuid || '',
    options: ('options' in componentProps.item
      ? componentProps.item.options
      : {}) as any,
    isEditing: componentProps.isEditing,
    parentType: componentProps.parentType,
  }
})

provide<InjectedBlokkliItem>(INJECT_BLOCK_ITEM, item)
</script>

<script lang="ts">
export default {
  name: 'BlokkliItem',
}
</script>
