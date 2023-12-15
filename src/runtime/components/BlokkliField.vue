<template>
  <slot :items="filteredList" />
  <DraggableList
    v-if="
      isEditing &&
      canEdit &&
      !isInReusable &&
      fieldConfig &&
      fieldConfig.name &&
      entity?.entityTypeId
    "
    :field-config="fieldConfig"
    :list="filteredList"
    :entity="entity"
    :class="[attrs.class, listClass]"
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
      :key="item.item.uuid"
      :item="item.item"
      :props="item.props"
      :parent-type="isNested ? entity?.entityBundle : ''"
      :data-uuid="item.item.uuid"
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
  BlokkliFieldList,
  BlokkliFieldListConfig,
  BlokkliFieldListEntity,
  BlokkliMutatedField,
} from '#blokkli/types'
import type { ValidFieldListTypes } from '#blokkli/generated-types'
import {
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

const props = withDefaults(
  defineProps<{
    list?: BlokkliFieldList<any>[]
    fieldConfig?: BlokkliFieldListConfig | null
    canEdit?: boolean
    entity?: BlokkliFieldListEntity | null
    tag?: string
    preventEdit?: boolean
    fieldListType?: ValidFieldListTypes
    editOnly?: boolean
    listClass?: string
  }>(),
  {
    list: () => [],
    tag: 'div',
    canEdit: false,
    fieldListType: 'default',
    fieldConfig: null,
    entity: null,
    listClass: '',
  },
)

const fieldKey = computed(() => {
  if (
    props.canEdit &&
    !isNested &&
    !isPreview &&
    props.entity &&
    props.fieldConfig
  ) {
    return props.entity.uuid + ':' + props.fieldConfig.name
  }
})

const fieldListType = computed(() => props.fieldListType)

const filteredList = computed<Array<Required<BlokkliFieldList<any>>>>(() => {
  if (mutatedFields?.value && !isInReusable) {
    return (mutatedFields.value.find(
      (field: BlokkliMutatedField) =>
        field.name === props.fieldConfig?.name &&
        field.entityType === props.entity?.entityTypeId &&
        field.entityUuid === props.entity?.uuid,
    )?.list || []) as Array<Required<BlokkliFieldList<any>>>
  }
  return props.list.filter((v) => v.item && v.props) as Array<
    Required<BlokkliFieldList<any>>
  >
})

provide(INJECT_IS_NESTED, true)
provide(INJECT_FIELD_LIST_TYPE, fieldListType)
</script>
