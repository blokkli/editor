<template>
  <slot v-if="!isGlobalProxyMode" :items="filteredList" />
  <Component
    :is="DraggableList"
    v-if="DraggableList && isEditing && canEdit && !isInReusable && entity"
    :list="filteredList"
    :name="name"
    :entity="entity"
    :field-key="fieldKey!"
    :allowed-fragments="allowedFragments"
    :nesting-level="nestingLevel"
    :drop-alignment="dropAlignment"
    :field-list-type="fieldListType"
    :class="[attrs.class, listClass, { [nonEmptyClass]: filteredList.length }]"
    :is-nested="isNested"
    :language="providerEntity.language"
    class="bk-field-list"
    :proxy-mode="proxyMode"
    :tag="tag"
    :global-proxy-mode="isGlobalProxyMode"
  />
  <component
    :is="tag"
    v-else-if="
      !editOnly &&
      (filteredList.length || isEditing || isPreview) &&
      !proxyMode &&
      !isGlobalProxyMode
    "
    :class="[
      attrs.class,
      {
        'bk-field-list': canEdit && !isNested && !isPreview,
        [nonEmptyClass]: filteredList.length,
      },
      listClass,
    ]"
  >
    <BlokkliItem
      v-for="(item, i) in filteredList"
      :key="item.uuid + fieldListType"
      v-bind="item"
      :parent-type="isNested ? entity?.bundle : ''"
      :data-uuid="isPreview ? item.uuid : undefined"
      :index="i"
    />
  </component>
  <slot v-if="!isGlobalProxyMode" name="after" :items="filteredList" />
</template>

<script lang="ts" setup>
import {
  computed,
  useAttrs,
  inject,
  provide,
  ref,
  type ComputedRef,
} from '#imports'
import type { BlokkliFragmentName } from '#blokkli/definitions'
import { isVisibleByOptions } from '#blokkli/helpers/runtimeHelpers'
import BlokkliItem from './BlokkliItem.vue'

import type {
  FieldListItem,
  MutatedField,
  EntityContext,
  ItemEditContext,
  BlokkliProviderEntityContext,
} from '#blokkli/types'
import type {
  ValidFieldListTypes,
  FieldListItemTyped,
} from '#blokkli/generated-types'
import {
  INJECT_ENTITY_CONTEXT,
  INJECT_FIELD_LIST_TYPE,
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
  INJECT_IS_NESTED,
  INJECT_IS_PREVIEW,
  INJECT_NESTING_LEVEL,
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_PROVIDER_BLOCKS,
  INJECT_EDIT_CONTEXT,
  INJECT_MUTATED_FIELDS_MAP,
  INJECT_EDIT_FIELD_LIST_COMPONENT,
  INJECT_PROVIDER_CONTEXT,
  INJECT_FIELD_PROXY_MODE,
  INJECT_GLOBAL_PROXY_MODE,
} from '../helpers/symbols'
import type DraggableListComponent from './Edit/DraggableList.vue'

const DraggableList = inject<typeof DraggableListComponent | null>(
  INJECT_EDIT_FIELD_LIST_COMPONENT,
  null,
)

const attrs = useAttrs()

defineOptions({
  inheritAttrs: false,
})

const isEditing = inject(INJECT_IS_EDITING, false)
const isGlobalProxyMode = inject<ComputedRef<boolean> | null>(
  INJECT_GLOBAL_PROXY_MODE,
  null,
)
const isInReusable = inject(INJECT_IS_IN_REUSABLE, false)
const isPreview = inject<boolean>(INJECT_IS_PREVIEW, false)
const isNested = inject(INJECT_IS_NESTED, false)
const nestingLevel = inject<number>(INJECT_NESTING_LEVEL, 0)
const mutatedFields = inject<Record<string, MutatedField> | null>(
  INJECT_MUTATED_FIELDS_MAP,
  null,
)
const editContext = inject<ItemEditContext | null>(INJECT_EDIT_CONTEXT, null)
const entity = inject<EntityContext>(INJECT_ENTITY_CONTEXT)

if (!entity) {
  throw new Error('Missing entity context.')
}

const providerEntity = inject<BlokkliProviderEntityContext>(
  INJECT_PROVIDER_CONTEXT,
)

const props = withDefaults(
  defineProps<{
    name: string
    list?: FieldListItem[] | FieldListItem
    tag?: string
    fieldListType?: ValidFieldListTypes
    editOnly?: boolean
    listClass?: string
    nonEmptyClass?: string
    allowedFragments?: BlokkliFragmentName[]
    dropAlignment?: 'vertical' | 'horizontal'
    /**
     * Renders proxy blocks during editing.
     */
    proxyMode?: boolean
  }>(),
  {
    list: () => [],
    tag: 'div',
    fieldListType: 'default',
    listClass: '',
    nonEmptyClass: '',
    allowedFragments: () => [],
    dropAlignment: undefined,
  },
)

// @TODO: How to canEdit?
const canEdit = ref(true)

const fieldKey = computed<string | undefined>(() => {
  if (canEdit.value) {
    return entity.uuid + ':' + props.name
  }
  return undefined
})

const fieldListType = computed(() => props.fieldListType)

function filterVisible(item?: FieldListItemTyped): boolean {
  // The block is always rendered during editing.
  if (isEditing) {
    return true
  }
  return isVisibleByOptions(item, providerEntity.value.language)
}

const filteredList = computed<FieldListItemTyped[]>(() => {
  if (mutatedFields && !isInReusable && editContext && fieldKey.value) {
    return ((mutatedFields[fieldKey.value] || {}).list || [])
      .map((v) => {
        const mutatedOptions = editContext.mutatedOptions[v.uuid] || {}
        return {
          ...v,
          options: {
            ...v.options,
            ...mutatedOptions,
          },
        } as FieldListItemTyped
      })
      .filter(filterVisible)
  }

  const list = Array.isArray(props.list) ? props.list : [props.list]
  return list.filter(filterVisible) as FieldListItemTyped[]
})

provide(INJECT_IS_NESTED, true)
provide(INJECT_NESTING_LEVEL, nestingLevel + 1)
provide(INJECT_FIELD_LIST_TYPE, fieldListType)
provide(INJECT_FIELD_LIST_BLOCKS, filteredList)

if (props.proxyMode) {
  provide(INJECT_IS_EDITING, false)
  provide(INJECT_FIELD_PROXY_MODE, false)
}

if (!isNested) {
  provide(INJECT_PROVIDER_BLOCKS, filteredList)
}
</script>
