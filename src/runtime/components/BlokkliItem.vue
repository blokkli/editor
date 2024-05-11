<template>
  <component :is="component" v-if="component" v-bind="props" />
  <div v-else-if="isEditing">Block not implemented</div>
</template>

<script lang="ts" setup>
import {
  computed,
  provide,
  useRuntimeConfig,
  inject,
  type ComputedRef,
} from '#imports'
import type { InjectedBlokkliItem } from '#blokkli/types'
import { getBlokkliItemComponent } from '#blokkli/imports'
import {
  INJECT_BLOCK_ITEM,
  INJECT_ENTITY_CONTEXT,
  INJECT_FIELD_LIST_TYPE,
} from '../helpers/symbols'
import type { ValidFieldListTypes } from '#blokkli/generated-types'

const itemEntityType = useRuntimeConfig().public.blokkli.itemEntityType

const componentProps = withDefaults(
  defineProps<{
    uuid: string
    bundle: string
    isNew?: boolean
    options?: any
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

const fieldListType = inject<ComputedRef<ValidFieldListTypes> | undefined>(
  INJECT_FIELD_LIST_TYPE,
)

const component = getBlokkliItemComponent(
  componentProps.bundle,
  fieldListType?.value || 'default',
  componentProps.parentType,
)

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
