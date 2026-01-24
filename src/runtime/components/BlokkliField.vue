<template>
  <slot v-if="!isGlobalProxyMode" :items="filteredList" />
  <Component
    :is="DraggableList"
    v-if="DraggableList && isEditing && canEdit && !isInReusable && entity"
    :list="filteredList"
    :name
    :entity
    :field-key
    :allowed-fragments
    :nesting-level
    :drop-alignment
    :field-list-type
    :class="[
      attrs.class,
      listClass,
      editClass,
      { [nonEmptyClass]: filteredList.length },
    ]"
    :is-nested
    :language="providerEntity?.language"
    :proxy-mode
    :tag
    :global-proxy-mode="!!isGlobalProxyMode"
    :should-render-item="shouldRenderItem"
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
      :data-bk-uuid="isPreview ? item.uuid : undefined"
      :index="i"
    />
  </component>
  <slot v-if="!isGlobalProxyMode" name="after" :items="filteredList" />
</template>

<script lang="ts" setup>
import { computed, useAttrs, inject, provide, ref } from '#imports'
import type { BlokkliFragmentName } from '#blokkli-build/definitions'
import { isVisibleByOptions } from '#blokkli/helpers/runtimeHelpers'
import BlokkliItem from './BlokkliItem.vue'

import type { FieldListItem } from '#blokkli/types'
import type {
  ValidFieldListTypes,
  FieldListItemTyped,
} from '#blokkli-build/generated-types'
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
  INJECT_FIELD_USES_PROXY,
} from '../helpers/injections'
import type { FieldDropAlignment } from '#blokkli/types/field'
import type { VueClassProp } from '#blokkli/types/vue'

if (import.meta.hot) {
  import.meta.hot.accept('#blokkli/helpers/runtimeHelpers', () => {})
}

const props = withDefaults(
  defineProps<{
    /**
     * The name of the field.
     */
    name: string

    /**
     * The field list items. Can be an array or a single item, also allows nullable values in an array.
     */
    list?: Array<FieldListItem | null | undefined> | FieldListItem | null

    /**
     * The tag to use for rendering the root element.
     */
    tag?: string

    /**
     * The field list types. The available types can be defined in the "fieldListTypes" module option.
     */
    fieldListType?: ValidFieldListTypes

    /**
     * If true, the field list items are only rendered in edit mode.
     * In normal mode, you are responsible yourself to render the items.
     */
    editOnly?: boolean

    /**
     * The classes to render for the list. Same as passing classes via the :class prop.
     */
    listClass?: VueClassProp

    /**
     * Classes only applied during editing.
     */
    editClass?: VueClassProp

    /**
     * Classes to apply if the field is not empty.
     */
    nonEmptyClass?: string

    /**
     * Define which fragments are allowed in this field.
     *
     * Note that this is only used during editing. It defines which fragments
     * can be added here. If you change this prop but there are existing
     * fragments already in the field list, they will continue to be rendered.
     *
     * Note that in addition, also the "blokkli_fragment" block must be allowed
     * as a bundle in this field.
     */
    allowedFragments?: BlokkliFragmentName[] | BlokkliFragmentName

    /**
     * Force an alignment during drag and drop interactions.
     */
    dropAlignment?: FieldDropAlignment

    /**
     * Renders proxy blocks during editing.
     *
     * Doing this will *not* render the actual block components.
     *
     * During editing, a separate element is rendered with "position: absolute"
     * that contains "proxy blocks" for drag and drop interactions. This means
     * that you need to have a wrapper somewhere with "position: relative".
     */
    proxyMode?: boolean

    /**
     * Determine whether an item should be rendered.
     */
    shouldRenderItem?: (item: FieldListItem | FieldListItemTyped) => boolean
  }>(),
  {
    list: () => [],
    tag: 'div',
    fieldListType: 'default',
    listClass: '',
    editClass: '',
    nonEmptyClass: '',
    allowedFragments: () => [],
    dropAlignment: undefined,
    shouldRenderItem: undefined,
  },
)

const DraggableList = inject(INJECT_EDIT_FIELD_LIST_COMPONENT, null)

const attrs = useAttrs()

defineOptions({
  inheritAttrs: false,
})

defineSlots<{
  default(props: { items: FieldListItemTyped[] }): any
  after(props: { items: FieldListItemTyped[] }): any
}>()

const isEditing = inject(INJECT_IS_EDITING, false)
const isGlobalProxyMode = inject(INJECT_GLOBAL_PROXY_MODE, null)
const isInReusable = inject(INJECT_IS_IN_REUSABLE, false)
const isPreview = inject(INJECT_IS_PREVIEW, null)
const isNested = inject(INJECT_IS_NESTED, false)
const nestingLevel = inject(INJECT_NESTING_LEVEL, 0)
const mutatedFields = inject(INJECT_MUTATED_FIELDS_MAP, null)
const editContext = inject(INJECT_EDIT_CONTEXT, null)
const entity = inject(INJECT_ENTITY_CONTEXT)

if (!entity) {
  throw new Error('Missing entity context.')
}

const providerEntity = inject(INJECT_PROVIDER_CONTEXT)!

if (!providerEntity) {
  throw new Error(
    'Missing blökkli injection: ' + INJECT_PROVIDER_CONTEXT.toString(),
  )
}

// @TODO: How to canEdit?
const canEdit = ref(true)

const fieldKey = computed<string>(() => {
  if (canEdit.value) {
    return entity.uuid + ':' + props.name
  }
  return ''
})

const fieldListType = computed(() => props.fieldListType)

function filterVisible(
  item?: FieldListItemTyped | FieldListItem | null,
): boolean {
  if (!item) {
    return false
  }

  // The block is always rendered during editing.
  if (isEditing) {
    return true
  }

  // When not editing, hide blocks that are not visible. This might be the case
  // if the block is unpublished or just generally not visible.
  if (!item.isVisible) {
    return false
  }

  const isVisible = isVisibleByOptions(item, providerEntity.value.language)
  const isVisibleCustom = props.shouldRenderItem
    ? props.shouldRenderItem(item)
    : true
  return isVisible && isVisibleCustom
}

const filteredList = computed<FieldListItemTyped[]>(() => {
  if (
    mutatedFields &&
    !isInReusable &&
    editContext &&
    fieldKey.value &&
    (isPreview?.value || isEditing)
  ) {
    return ((mutatedFields[fieldKey.value] || {}).list || []).map((v) => {
      const mutatedOptions = editContext.mutatedOptions[v.uuid] || {}
      return {
        ...v,
        options: {
          ...v.options,
          ...mutatedOptions,
        },
      } as FieldListItemTyped
    })
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
  provide(INJECT_FIELD_USES_PROXY, true)
}

if (!isNested) {
  provide(INJECT_PROVIDER_BLOCKS, filteredList)
}
</script>
