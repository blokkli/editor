<template>
  <slot :items="filteredList" />
  <DraggableList
    v-if="isEditing && canEdit && !isInReusable"
    :list="filteredList"
    :name="name"
    :label="label"
    :cardinality="cardinality"
    :entity="entity"
    :field-key="fieldKey!"
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
    v-else-if="!editOnly"
    :class="[
      attrs.class,
      { 'bk-field-list': canEdit && !isNested && !isPreview },
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
  type Ref,
} from '#imports'

import type {
  BlokkliFieldListItem,
  BlokkliMutatedField,
  BlokkliEntityContext,
} from '#blokkli/types'
import type { ValidFieldListTypes } from '#blokkli/generated-types'
import {
  INJECT_ENTITY_CONTEXT,
  INJECT_FIELD_LIST_TYPE,
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
  INJECT_IS_NESTED,
  INJECT_IS_PREVIEW,
  INJECT_MUTATED_FIELDS,
} from '../helpers/symbols'

const DraggableList = defineAsyncComponent(() => {
  return import('./Edit/DraggableList/index.vue')
})

const attrs = useAttrs()

const isEditing = inject(INJECT_IS_EDITING, false)
const isInReusable = inject(INJECT_IS_IN_REUSABLE, false)
const isPreview = inject<boolean>(INJECT_IS_PREVIEW, false)
const isNested = inject(INJECT_IS_NESTED, false)
const mutatedFields = inject<Ref<BlokkliMutatedField[]> | null>(
  INJECT_MUTATED_FIELDS,
  null,
)
const entity = inject<BlokkliEntityContext>(INJECT_ENTITY_CONTEXT)

if (!entity) {
  throw new Error('Missing entity context.')
}

const props = withDefaults(
  defineProps<{
    name: string
    label?: string
    cardinality?: number
    list?: BlokkliFieldListItem[]
    canEdit?: boolean
    tag?: string
    fieldListType?: ValidFieldListTypes
    editOnly?: boolean
    listClass?: string
    nonEmptyClass?: string
  }>(),
  {
    list: () => [],
    tag: 'div',
    label: '',
    cardinality: -1,
    canEdit: false,
    fieldListType: 'default',
    listClass: '',
    nonEmptyClass: '',
  },
)

const fieldKey = computed(() => {
  if (props.canEdit && !isPreview) {
    return entity.uuid + ':' + props.name
  }
})

const fieldListType = computed(() => props.fieldListType)

const filteredList = computed<BlokkliFieldListItem[]>(() => {
  if (mutatedFields?.value && !isInReusable) {
    return (
      mutatedFields.value.find(
        (field: BlokkliMutatedField) =>
          field.name === props.name &&
          field.entityType === entity.type &&
          field.entityUuid === entity.uuid,
      )?.list || []
    )
  }
  return props.list
})

provide(INJECT_IS_NESTED, true)
provide(INJECT_FIELD_LIST_TYPE, fieldListType)
</script>
