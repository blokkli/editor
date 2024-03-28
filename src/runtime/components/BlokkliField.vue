<template>
  <slot :items="filteredList" />
  <DraggableList
    v-if="isEditing && canEdit && !isInReusable"
    :list="filteredList"
    :name="name"
    :entity="entity"
    :field-key="fieldKey!"
    :allowed-fragments="allowedFragments"
    :class="[
      attrs.class,
      listClass,
      { 'bk-is-empty': !list.length, [nonEmptyClass]: filteredList.length },
    ]"
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
  type Ref,
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
  INJECT_MUTATED_FIELDS,
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_PROVIDER_BLOCKS,
  INJECT_EDIT_CONTEXT,
} from '../helpers/symbols'

const DraggableList = defineAsyncComponent(() => {
  return import('./Edit/DraggableList.vue')
})

const attrs = useAttrs()

const isEditing = inject(INJECT_IS_EDITING, false)
const isInReusable = inject(INJECT_IS_IN_REUSABLE, false)
const isPreview = inject<boolean>(INJECT_IS_PREVIEW, false)
const isNested = inject(INJECT_IS_NESTED, false)
const mutatedFields = inject<Ref<MutatedField[]> | null>(
  INJECT_MUTATED_FIELDS,
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
  }>(),
  {
    list: () => [],
    tag: 'div',
    fieldListType: 'default',
    listClass: '',
    nonEmptyClass: '',
    allowedFragments: () => [],
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
  if (mutatedFields?.value && !isInReusable && editContext) {
    return (
      (mutatedFields.value.find(
        (field: MutatedField) =>
          field.name === props.name &&
          field.entityType === entity.type &&
          field.entityUuid === entity.uuid,
      )?.list || []) as FieldListItemTyped[]
    ).map<any>((v) => {
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
  return props.list.filter(Boolean) as FieldListItemTyped[]
})

provide(INJECT_IS_NESTED, true)
provide(INJECT_FIELD_LIST_TYPE, fieldListType)
provide(INJECT_FIELD_LIST_BLOCKS, filteredList)

if (!isNested) {
  provide(INJECT_PROVIDER_BLOCKS, filteredList)
}
</script>
