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
import { PbFieldItemFragment, PbMutatedField, PbField } from './../types'
import { ValidFieldListTypes } from '#nuxt-paragraphs-builder/generated-types'

const ParagraphsList = defineAsyncComponent(() => {
  return import('./Edit/ParagraphsList/index.vue')
})

const attrs = useAttrs()

const isEditing = inject('isEditing', false)
const isInReusable = inject('paragraphsBuilderReusable', false)
const isPreview = inject<boolean>('paragraphsBuilderPreview', false)
const isNested = inject('paragraphsBuilderIsNested', false)
const mutatedFields = inject<Ref<PbMutatedField[]> | null>(
  'paragraphsBuilderMutatedFields',
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

provide('paragraphsBuilderIsNested', true)
provide('paragraphsBuilderFieldListType', fieldListType)
</script>

<style lang="postcss">
.pb-field-paragraphs {
  position: relative;
  min-height: 3rem;
  &:hover {
    outline: 1px dashed;
    .pb-field-paragraphs {
      outline: 1px dashed;
    }
  }
}

.pb-body {
  .pb-main-canvas {
    background: white;
  }
}
</style>
