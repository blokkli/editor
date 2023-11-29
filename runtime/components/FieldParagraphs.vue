<template>
  <slot :items="filteredList"></slot>
  <ParagraphsList
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
    class="field-paragraphs pb-field-paragraphs"
    :tag="tag"
  />
  <component
    v-else-if="!editOnly"
    :is="tag"
    :class="[
      attrs.class,
      { 'pb-field-paragraphs': canEdit && !isNested && !isPreview },
      listClass,
    ]"
    class="field-paragraphs"
    :data-field-key="fieldKey"
  >
    <PbItem
      v-for="(item, i) in filteredList"
      :key="item.item.uuid"
      :item="item.item"
      :paragraph="item.paragraph"
      :parent-paragraph-bundle="isNested ? entity?.entityBundle : ''"
      :data-uuid="item.item.uuid"
      :index="i"
    />
  </component>
  <slot name="after" :items="filteredList"></slot>
</template>

<script lang="ts" setup>
import type { PbFieldItemFragment, PbMutatedField, PbField } from '#pb/types'
import type { ValidFieldListTypes } from '#nuxt-paragraphs-builder/generated-types'
import {
  INJECT_FIELD_LIST_TYPE,
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
  INJECT_IS_NESTED,
  INJECT_IS_PREVIEW,
  INJECT_MUTATED_FIELDS,
} from '../helpers/symbols'

const ParagraphsList = defineAsyncComponent(() => {
  return import('./Edit/ParagraphsList/index.vue')
})

const attrs = useAttrs()

const isEditing = inject(INJECT_IS_EDITING, false)
const isInReusable = inject(INJECT_IS_IN_REUSABLE, false)
const isPreview = inject<boolean>(INJECT_IS_PREVIEW, false)
const isNested = inject(INJECT_IS_NESTED, false)
const mutatedFields = inject<Ref<PbMutatedField[]> | null>(
  INJECT_MUTATED_FIELDS,
  null,
)

const props = withDefaults(
  defineProps<{
    list?: PbFieldItemFragment<any>[]
    fieldConfig?: PbField['fieldConfig']
    canEdit?: boolean
    entity?: PbField['entity']
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

const filteredList = computed<Array<Required<PbFieldItemFragment<any>>>>(() => {
  if (mutatedFields?.value && !isNested && !isInReusable) {
    return (mutatedFields.value.find((v) => v.name === props.fieldConfig?.name)
      ?.field.list || []) as Array<Required<PbFieldItemFragment<any>>>
  }
  return props.list.filter((v) => v.item && v.paragraph) as Array<
    Required<PbFieldItemFragment<any>>
  >
})

provide(INJECT_IS_NESTED, true)
provide(INJECT_FIELD_LIST_TYPE, fieldListType)
</script>
