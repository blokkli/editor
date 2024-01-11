<template>
  <component v-if="component" :is="component" v-bind="props" />
  <div v-else-if="isEditing">Block not implemented</div>
</template>

<script lang="ts" setup>
import { computed, provide, useRuntimeConfig } from '#imports'
import type { InjectedBlokkliItem } from '#blokkli/types'
import { getBlokkliItemComponent } from '#blokkli/imports'
import { INJECT_BLOCK_ITEM, INJECT_ENTITY_CONTEXT } from '../helpers/symbols'

const itemEntityType = useRuntimeConfig().public.blokkli.itemEntityType

const componentProps = withDefaults(
  defineProps<{
    uuid: string
    bundle: string
    isNew?: boolean
    options?: Record<string, string>
    props?: any
    index?: number
    parentType?: string
    isEditing?: boolean
  }>(),
  {
    index: 0,
    isEditing: false,
    parentType: '',
    options: () => ({}),
    props: () => ({}),
  },
)

const component = getBlokkliItemComponent(componentProps.bundle)

const index = computed(() => componentProps.index)
const item = computed(() => ({
  index,
  uuid: componentProps.uuid || '',
  options: componentProps.options || {},
  isEditing: componentProps.isEditing,
  parentType: componentProps.parentType,
}))

provide<InjectedBlokkliItem>(INJECT_BLOCK_ITEM, item)
provide(INJECT_ENTITY_CONTEXT, {
  uuid: componentProps.uuid,
  type: itemEntityType,
  bundle: componentProps.bundle,
})
</script>

<script lang="ts">
export default {
  name: 'BlokkliItem',
}
</script>
