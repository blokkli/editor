<template>
  <Component
    :is="component"
    v-if="isProxyMode || isGlobalProxyMode"
    :bundle="bundle"
    :uuid="uuid"
    :field-list-type="fieldListType"
    :parent-type="parentType"
    :item-props
  />
  <Component
    :is="component"
    v-else-if="component"
    v-bind="itemProps"
    :data-bk-in-proxy="fieldUsesProxy || (isEditing ? 'false' : undefined)"
  />
  <Component
    :is="blockNotImplemented"
    v-else-if="blockNotImplemented"
    :uuid
    :bundle
  />
</template>

<script lang="ts" setup>
import { computed, provide, inject, defineAsyncComponent } from '#imports'
import { getComponent } from '#blokkli/helpers/imports'
import {
  INJECT_ALL_COMPONENTS_CHUNK,
  INJECT_BLOCK_ITEM,
  INJECT_ENTITY_CONTEXT,
  INJECT_FIELD_LIST_TYPE,
  INJECT_FIELD_PROXY_MODE,
  INJECT_FIELD_USES_PROXY,
  INJECT_GLOBAL_PROXY_MODE,
  INJECT_ITEM_PROPS_OVERRIDE,
} from '../helpers/injections'
import type { BlockBundleWithNested } from '#blokkli-build/generated-types'
import { fragmentBlockBundle, itemEntityType } from '#blokkli-build/config'
import type {
  BlockEditContext,
  InjectedBlokkliItem,
} from '#blokkli/types/field'

const componentProps = withDefaults(
  defineProps<{
    // From FieldListItem.
    uuid: string
    bundle: string
    isVisible?: boolean
    options?: any
    editContext?: BlockEditContext
    props?: any

    // From BlokkliField.
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
    editContext: undefined,
  },
)

const isProxyMode = inject(INJECT_FIELD_PROXY_MODE, false)
const mutatedItemProps = inject(INJECT_ITEM_PROPS_OVERRIDE, null)
const allComponentsChunk = inject(INJECT_ALL_COMPONENTS_CHUNK, null)
const fieldUsesProxy = inject(INJECT_FIELD_USES_PROXY, false)
const isGlobalProxyMode = inject(INJECT_GLOBAL_PROXY_MODE, null)
const fieldListType = inject(INJECT_FIELD_LIST_TYPE, undefined)

const itemProps = computed<Record<string, string>>(() => {
  if (mutatedItemProps) {
    const mutatedProps = mutatedItemProps[componentProps.uuid]
    if (mutatedProps) {
      return {
        ...componentProps.props,
        ...mutatedProps,
      }
    }
  }

  return componentProps.props
})

const component =
  isProxyMode || isGlobalProxyMode?.value
    ? defineAsyncComponent(
        () => import('./../editor/components/BlockProxy/index.vue'),
      )
    : getComponent(
        'block',
        componentProps.bundle,
        fieldListType?.value || 'default',
        componentProps.parentType,
        allComponentsChunk,
      )

const blockNotImplemented = componentProps.isEditing
  ? defineAsyncComponent(() => import('./Blocks/NotImplemented/index.vue'))
  : null

const index = computed<number>(() => componentProps.index)
const item = computed<InjectedBlokkliItem>(() => ({
  index,
  uuid: componentProps.uuid || '',
  options: componentProps.options || {},
  isEditing: componentProps.isEditing,
  parentType: componentProps.parentType as BlockBundleWithNested,
  fragmentName:
    componentProps.bundle === fragmentBlockBundle
      ? componentProps.props?.name
      : undefined,
}))

provide(INJECT_BLOCK_ITEM, item)
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
