<template>
  <slot :items="filteredList" />
  <DraggableList
    v-if="isEditing && canEdit && !isInReusable"
    :list="filteredList"
    :name="name"
    :entity="entity"
    :field-key="fieldKey!"
    :allowed-fragments="allowedFragments"
    :drop-alignment="dropAlignment"
    :class="[attrs.class, listClass, { [nonEmptyClass]: filteredList.length }]"
    :is-nested="isNested"
    :data-field-block-count="filteredList.length"
    class="bk-field-list"
    :tag="tag"
  />
  <component
    :is="tag"
    v-else-if="!editOnly && (filteredList.length || isEditing)"
    :class="[
      attrs.class,
      {
        'bk-field-list': canEdit && !isNested && !isPreview,
        [nonEmptyClass]: filteredList.length,
      },
      listClass,
    ]"
    :data-field-key="fieldKey"
  >
    <BlokkliItem
      v-for="(item, i) in filteredList"
      :key="item.uuid"
      v-bind="item"
      :parent-type="isNested ? entity?.bundle : ''"
      :data-uuid="item.uuid"
      :data-bk-block-item="isEditing ? 'true' : undefined"
      :index="i"
    />
  </component>
  <slot name="after" :items="filteredList" />
</template>

<script lang="ts" setup>
import {
  computed,
  defineAsyncComponent,
  useAttrs,
  inject,
  provide,
  ref,
  type ComputedRef,
} from '#imports'
import { type BlokkliFragmentName } from '#blokkli/definitions'

import type {
  FieldListItem,
  MutatedField,
  EntityContext,
  ItemEditContext,
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
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_PROVIDER_BLOCKS,
  INJECT_EDIT_CONTEXT,
  INJECT_MUTATED_FIELDS_MAP,
} from '../helpers/symbols'

const DraggableList = defineAsyncComponent(() => {
  return import('./Edit/DraggableList.vue')
})

const BlokkliItem = defineAsyncComponent(() => {
  return import('./BlokkliItem.vue')
})

const attrs = useAttrs()

defineOptions({
  inheritAttrs: false,
})

const isEditing = inject(INJECT_IS_EDITING, false)
const isInReusable = inject(INJECT_IS_IN_REUSABLE, false)
const isPreview = inject<boolean>(INJECT_IS_PREVIEW, false)
const isNested = inject(INJECT_IS_NESTED, false)
const mutatedFields = inject<ComputedRef<Record<string, MutatedField>> | null>(
  INJECT_MUTATED_FIELDS_MAP,
  null,
)
const editContext = inject<ItemEditContext | null>(INJECT_EDIT_CONTEXT, null)
const entity = inject<EntityContext>(INJECT_ENTITY_CONTEXT)

if (!entity) {
  throw new Error('Missing entity context.')
}

const props = withDefaults(
  defineProps<{
    name: string
    list?: FieldListItem[]
    tag?: string
    fieldListType?: ValidFieldListTypes
    editOnly?: boolean
    listClass?: string
    nonEmptyClass?: string
    allowedFragments?: BlokkliFragmentName[]
    dropAlignment?: 'vertical' | 'horizontal'
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

const fieldKey = computed(() => {
  if (canEdit.value && !isPreview) {
    return entity.uuid + ':' + props.name
  }
})

const fieldListType = computed(() => props.fieldListType)

const filteredList = computed<FieldListItemTyped[]>(() => {
  if (mutatedFields?.value && !isInReusable && editContext && fieldKey.value) {
    const field = mutatedFields.value[fieldKey.value]
    if (field) {
      return field.list.map<any>((v) => {
        const mutatedOptions = editContext.mutatedOptions.value[v.uuid] || {}
        return {
          ...v,
          options: {
            ...v.options,
            ...mutatedOptions,
          },
        }
      })
    }
    return []
  }
  return props.list.filter(Boolean) as FieldListItemTyped[]
})

provide(INJECT_IS_NESTED, true)
provide(INJECT_FIELD_LIST_TYPE, fieldListType)
provide(INJECT_FIELD_LIST_BLOCKS, filteredList)

if (!isNested) {
  provide(INJECT_PROVIDER_BLOCKS, filteredList)
}
</script>
