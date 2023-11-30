<template>
  <div
    :data-provider-uuid="entityUuid"
    :data-blokkli-provider-active="isInEditor || undefined"
  >
    <template v-if="isInEditor">
      <PbPreviewProvider
        v-if="isPreviewing"
        :entity-type="entityType"
        :entity-uuid="entityUuid"
        :entity-bundle="entityBundle"
        :language="language"
      >
        <slot
          :is-editing="isEditing"
          :can-edit="canEdit"
          :is-preview="isPreviewing"
        ></slot>
      </PbPreviewProvider>
      <PbEditProvider
        v-else-if="isEditing"
        :entity-type="entityType"
        :entity-uuid="entityUuid"
        :entity-bundle="entityBundle"
        :language="language"
      >
        <slot
          :is-editing="isEditing"
          :can-edit="canEdit"
          :is-preview="isPreviewing"
        ></slot>
      </PbEditProvider>
    </template>

    <slot
      v-else
      :is-editing="isEditing"
      :can-edit="canEdit"
      :is-preview="isPreviewing"
    ></slot>

    <PbEditIndicator v-if="showIndicator" :uuid="entityUuid" @edit="edit" />
  </div>
</template>

<script lang="ts" setup>
const PbPreviewProvider = defineAsyncComponent(
  () => import('./PreviewProvider.vue'),
)

const PbEditProvider = defineAsyncComponent(() => import('./EditProvider.vue'))

const PbEditIndicator = defineAsyncComponent(
  () => import('./EditIndicator.vue'),
)

const route = useRoute()
const router = useRouter()

const props = withDefaults(
  defineProps<{
    entityType: string
    entityBundle: string
    entityUuid: string
    canEdit: boolean
    tag?: string
    language?: string
  }>(),
  {
    tag: 'div',
    language: '',
  },
)

const isInEditor = computed(
  () =>
    props.entityUuid &&
    props.entityType &&
    props.entityBundle &&
    (isPreviewing.value || isEditing.value),
)

const isEditing = computed(() => {
  return (
    props.canEdit &&
    !!props.entityUuid &&
    route.query.pbEditing === props.entityUuid
  )
})

const isPreviewing = computed(() => {
  return props.entityUuid && route.query.pbPreview === props.entityUuid
})

const showIndicator = computed(
  () => props.canEdit && !route.query.pbEditing && !route.query.pbPreview,
)

function edit() {
  router.push({
    query: {
      pbEditing: props.entityUuid,
      language: props.language,
    },
  })
}
</script>
