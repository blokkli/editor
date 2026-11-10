<template>
  <Component
    :is="component"
    v-if="isGlobalProxyMode"
    :key="'component'"
    :bundle="bundle"
    :uuid="uuid"
    :field-list-type="fieldListType"
    :parent-type="placement.parentType"
    :item-props
  />
  <!--
    In the slot of a field in proxy mode that renders the shown block itself
    (proxy-mode="slot"), while editing: the shown block is the real block, the
    others render as on the site. Keyed by both, so that a block switches.
  -->
  <Component
    :is="pagerSlot.component"
    v-else-if="pagerSlot && isInPagerSlot"
    :key="pagerSlotKey"
    :uuid
    :bundle
    :is-shown="isShownInPagerSlot"
    :has-slot="!!$slots.default"
  >
    <slot v-if="$slots.default" />
    <Component :is="component" v-else-if="component" v-bind="itemProps" />
    <Component
      :is="blockNotImplemented"
      v-else-if="isEditingComponent && blockNotImplemented"
      :uuid
      :bundle
    />
  </Component>
  <!-- The project's markup as the block. -->
  <slot v-else-if="$slots.default" />
  <Component
    :is="component"
    v-else-if="component"
    v-bind="itemProps"
    :key="'proxy'"
    :data-bk-in-proxy="fieldUsesProxy || (isEditing ? 'false' : undefined)"
  />
  <Component
    :is="blockNotImplemented"
    v-else-if="isEditingComponent && blockNotImplemented"
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
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_FIELD_LIST_TYPE,
  INJECT_FIELD_PARENT_TYPE,
  INJECT_FIELD_USES_PROXY,
  INJECT_GLOBAL_PROXY_MODE,
  INJECT_ITEM_PROPS_OVERRIDE,
  INJECT_PAGER_SLOT,
  INJECT_PROVIDER_TYPE,
} from '../helpers/injections'
import { getItemPlacement } from '../helpers/itemPlacement'
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

    // From BlokkliField. In the field's slot, one of its blocks gets the index
    // and the parent type from the field when they aren't passed.
    index?: number
    parentType?: string
    isEditing?: boolean
  }>(),
  {
    index: undefined,
    isEditing: false,
    parentType: undefined,
    options: () => ({}),
    props: () => ({}),
    editContext: undefined,
  },
)

const isEditingComponent = import.meta.blokkliEditing

const mutatedItemProps = inject(INJECT_ITEM_PROPS_OVERRIDE, null)
const allComponentsChunk = inject(INJECT_ALL_COMPONENTS_CHUNK, null)
const fieldUsesProxy = inject(INJECT_FIELD_USES_PROXY, false)
const isGlobalProxyMode = inject(INJECT_GLOBAL_PROXY_MODE, null)
const fieldListType = inject(INJECT_FIELD_LIST_TYPE, undefined)
const providerType = inject(INJECT_PROVIDER_TYPE, undefined)
const fieldBlocks = inject(INJECT_FIELD_LIST_BLOCKS, null)
const fieldParentType = inject(INJECT_FIELD_PARENT_TYPE, '')

// Its index and the type of the block holding its field: as passed, or, for a
// block of the field whose slot renders it, as the field passes them to the
// blocks it renders itself.
const placement = computed(() =>
  getItemPlacement(
    {
      uuid: componentProps.uuid,
      index: componentProps.index,
      parentType: componentProps.parentType,
    },
    fieldBlocks
      ? {
          parentType: fieldParentType,
          getUuids: () => fieldBlocks.value.map((block) => block.uuid),
        }
      : null,
  ),
)

// Provided by the editor's pager to the slot of a field in proxy mode that
// renders the shown block itself. The blocks of fields nested in it inherit it,
// so it only counts for the field's own blocks.
const pagerSlot = inject(INJECT_PAGER_SLOT, null)
const isInPagerSlot = computed(
  () => !!pagerSlot && pagerSlot.uuids.value.includes(componentProps.uuid),
)
const isShownInPagerSlot = computed(
  () =>
    isInPagerSlot.value && pagerSlot!.shownUuid.value === componentProps.uuid,
)
const pagerSlotKey = computed(
  () => componentProps.uuid + (isShownInPagerSlot.value ? ':shown' : ':other'),
)

// Whether the block is edited: where the editor renders it, or as the shown
// block of a field whose slot renders it.
const isEditingBlock = computed(
  () => componentProps.isEditing || isShownInPagerSlot.value,
)

const itemProps = computed<Record<string, string>>(() => {
  if (mutatedItemProps && isEditingBlock.value) {
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
  isGlobalProxyMode?.value && isEditingComponent && import.meta.client
    ? defineAsyncComponent(
        () => import('./../editor/components/BlockProxy/index.vue'),
      )
    : getComponent(
        'block',
        componentProps.bundle,
        {
          fieldListType: fieldListType?.value || 'default',
          parentBundle: placement.value.parentType,
          providerType,
        },
        allComponentsChunk,
      )

const blockNotImplemented =
  isEditingComponent && import.meta.client
    ? defineAsyncComponent(() => import('./Blocks/NotImplemented/index.vue'))
    : null

const blockIndex = computed<number>(() => placement.value.index)
const item = computed<InjectedBlokkliItem>(() => ({
  index: blockIndex,
  uuid: componentProps.uuid || '',
  options: componentProps.options || {},
  isEditing: isEditingBlock.value,
  parentType: placement.value.parentType as BlockBundleWithNested,
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
