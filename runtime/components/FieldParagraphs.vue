<template>
  <slot :items="filteredList"></slot>
  <template
    v-if="
      isEditing &&
      canEdit &&
      !isInReusable &&
      fieldConfig &&
      fieldConfig.name &&
      entity?.entityTypeId
    "
  >
    <ParagraphsList
      :field-config="fieldConfig"
      :list="filteredList"
      :entity="entity"
      :class="attrs.class"
      :is-nested="isNested"
      class="field-paragraphs pb-field-paragraphs"
      :tag="tag"
    />
  </template>
  <component
    v-else
    :is="tag"
    :class="[
      attrs.class,
      { 'pb-field-paragraphs': canEdit && !isNested && !isPreview },
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

    <PbEditIndicator
      v-if="fieldKey && showIndicator"
      :field-name="fieldConfig?.label"
      :field-key="fieldKey"
      @edit="edit"
    />
  </component>
</template>

<script lang="ts" setup>
import { PbFieldItemFragment, PbMutatedField, PbField } from './../types'
import { ValidFieldListTypes } from '#nuxt-paragraphs-builder/generated-types'

const PbEditIndicator = defineAsyncComponent(() => {
  return import('./EditIndicator.vue')
})

const ParagraphsList = defineAsyncComponent(() => {
  return import('./Edit/ParagraphsList/index.vue')
})

const attrs = useAttrs()

const workflowEnabled = false

const isEditing = inject('isEditing', false)
const isInReusable = inject('paragraphsBuilderReusable', false)
const isPreview = inject<boolean>('paragraphsBuilderPreview', false)
const isNested = inject('paragraphsBuilderIsNested', false)
const mutatedFields = inject<Ref<PbMutatedField[]> | null>(
  'paragraphsBuilderMutatedFields',
  null,
)
const router = useRouter()
const route = useRoute()

function edit() {
  if (props.entity?.id && workflowEnabled) {
    // @TODO: Proper route generating.
    return router.push({
      path: `/de/node/${props.entity.id}/latest`,
      query: {
        pbEditing: props.entity?.uuid,
      },
    })
  }
  router.push({
    query: {
      pbEditing: props.entity?.uuid,
    },
  })
}

const props = withDefaults(
  defineProps<{
    list?: PbFieldItemFragment[]
    fieldConfig?: PbField['fieldConfig']
    canEdit?: boolean
    entity?: PbField['entity']
    tag?: string
    preventEdit?: boolean
    fieldListType?: ValidFieldListTypes
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

const showIndicator = computed(() => fieldKey.value && !route.query.pbEditing)

const fieldListType = computed(() => props.fieldListType)

const filteredList = computed<Array<Required<PbFieldItemFragment>>>(() => {
  if (mutatedFields?.value && !isNested) {
    return (mutatedFields.value.find((v) => v.name === props.fieldConfig?.name)
      ?.field.list || []) as Array<Required<PbFieldItemFragment>>
  }
  return props.list.filter((v) => v.item && v.paragraph) as Array<
    Required<PbFieldItemFragment>
  >
})

provide('paragraphsBuilderIsNested', true)
provide('paragraphsBuilderFieldListType', fieldListType)
</script>

<style lang="postcss">
.pb-field-paragraphs {
  position: relative;
  min-height: 5rem;
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
