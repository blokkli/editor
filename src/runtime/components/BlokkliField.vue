<template>
  <slot
    v-if="!isGlobalProxyMode && !rendersPager"
    :items="filteredList"
    :shown-index="null"
  />
  <Component
    :is="DraggableList"
    v-if="rendersEditorList"
    :list="filteredList"
    :name
    :entity
    :field-key
    :allowed-fragments
    :nesting-level
    :drop-alignment
    :field-list-type
    :class="proxyMode ? attrs.class : [attrs.class, editorListClass]"
    :list-class="proxyMode ? editorListClass : undefined"
    :is-nested
    :z-index
    :language="providerEntity?.language"
    :proxy-mode
    :tag
    :global-proxy-mode="!!isGlobalProxyMode"
    :should-render-item="shouldRenderItem"
  >
    <!-- The slot renders the shown block below the band. -->
    <template v-if="rendersSlot" #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </Component>
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
import { computed, useAttrs, inject, provide } from '#imports'
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
  INJECT_FIELD_Z_INDEX,
  INJECT_IS_EDITING,
  INJECT_IS_OUTSIDE_STATE,
  INJECT_IS_NESTED,
  INJECT_IS_PREVIEW,
  INJECT_NESTING_LEVEL,
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_PROVIDER_BLOCKS,
  INJECT_EDIT_CONTEXT,
  INJECT_MUTATED_FIELDS_MAP,
  INJECT_EDIT_FIELD_LIST_COMPONENT,
  INJECT_PROVIDER_CONTEXT,
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
     * The z-index of this field, used to resolve overlapping blocks at the same
     * nesting level. Higher values take priority. Default is 0.
     */
    zIndex?: number | string

    /**
     * Renders the field as a pager while editing, for a field that shows one
     * block at a time, such as a slider.
     *
     * On the site and in the preview, the default slot renders the blocks from
     * its `items`. While editing, the editor renders a band of pages, one per
     * block, and below it the block the field shows, as a real block.
     * Selecting a page shows its block.
     *
     * While editing, `class` goes on the element that holds the band and the
     * block; `tag`, `listClass`, `editClass` and `nonEmptyClass` go on the list
     * that holds the block. On the site, the slot renders what it wants.
     *
     * With `'slot'`, the default slot renders the shown block while editing
     * too, below the band, for a field whose layout matters, such as a scene.
     * Its `shownIndex` is the index of the block the field shows, and `null` on
     * the site and in the preview. The slot renders that block as a keyed
     * `<BlokkliItem>`, with a default slot around the markup that belongs to
     * it; that markup is then the block, edited in place. Every other block's
     * `<BlokkliItem>` renders as on the site. What the slot can't show, it
     * renders as `<BlokkliItem v-bind="item" />`.
     *
     * Read once: to switch between proxy mode and a normal field, render two
     * fields with `v-if` and `v-else`.
     */
    proxyMode?: boolean | 'slot'

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
    zIndex: 0,
  },
)

const DraggableList = inject(INJECT_EDIT_FIELD_LIST_COMPONENT, null)

const attrs = useAttrs()

defineOptions({
  inheritAttrs: false,
})

defineSlots<{
  default(props: {
    items: FieldListItemTyped[]
    /**
     * With `proxy-mode="slot"`, while editing: the index of the block the
     * field shows. Else `null`.
     */
    shownIndex: number | null
  }): any
  after(props: { items: FieldListItemTyped[] }): any
}>()

const isEditing = inject(INJECT_IS_EDITING, false)
const isGlobalProxyMode = inject(INJECT_GLOBAL_PROXY_MODE, null)
const isOutsideState = inject(INJECT_IS_OUTSIDE_STATE, false)
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

// A field that the editor can't edit shows what it holds, and so does
// everything in it: it's outside the edit state, as a library item is.
const canEdit =
  !editContext ||
  editContext.isFieldEditable(entity.type, entity.bundle, props.name)

// The editor renders the field: as a list of blocks, or as a pager for a field
// in proxy mode, whose slot then doesn't render. Read once, like the provides
// below.
const rendersEditorList = !!(
  DraggableList &&
  isEditing &&
  canEdit &&
  !isOutsideState
)
const rendersPager = rendersEditorList && !!props.proxyMode

// The slot renders the shown block below the band.
const rendersSlot = rendersPager && props.proxyMode === 'slot'

const fieldKey = computed<string>(() => {
  if (canEdit) {
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
    !isOutsideState &&
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

// The classes of the list holding the blocks while editing.
const editorListClass = computed(() => [
  props.listClass,
  props.editClass,
  { [props.nonEmptyClass]: filteredList.value.length },
])

provide(INJECT_IS_NESTED, true)
provide(INJECT_NESTING_LEVEL, nestingLevel + 1)
provide(INJECT_FIELD_Z_INDEX, Number(props.zIndex))
provide(INJECT_FIELD_LIST_TYPE, fieldListType)
provide(INJECT_FIELD_LIST_BLOCKS, filteredList)

// The slot renders the blocks, outside the editor.
if (props.proxyMode && !rendersPager) {
  provide(INJECT_IS_EDITING, false)
  provide(INJECT_FIELD_USES_PROXY, true)
}

if (!isNested) {
  provide(INJECT_PROVIDER_BLOCKS, filteredList)
}

if (!canEdit) {
  provide(INJECT_IS_OUTSIDE_STATE, true)
}
</script>
