<template>
  <div
    :data-provider-uuid="entityUuid"
    :data-blokkli-provider-active="isInEditor || undefined"
  >
    <template v-if="isInEditor">
      <PreviewProvider
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
        />
      </PreviewProvider>
      <EditProvider
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
        />
      </EditProvider>
    </template>

    <slot
      v-else
      :is-editing="isEditing"
      :can-edit="canEdit"
      :is-preview="isPreviewing"
    />

    <EditIndicator v-if="showIndicator" :uuid="entityUuid" @edit="edit" />
  </div>
</template>

<script lang="ts" setup>
const PreviewProvider = defineAsyncComponent(
  () => import('./Edit/PreviewProvider.vue'),
)

const EditProvider = defineAsyncComponent(
  () => import('./Edit/EditProvider.vue'),
)

const EditIndicator = defineAsyncComponent(() => import('./EditIndicator.vue'))

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
    route.query.blokkliEditing === props.entityUuid
  )
})

const isPreviewing = computed(() => {
  return props.entityUuid && route.query.blokkliPreview === props.entityUuid
})

const showIndicator = computed(
  () =>
    props.canEdit && !route.query.blokkliEditing && !route.query.blokkliPreview,
)

function edit() {
  router.push({
    query: {
      blokkliEditing: props.entityUuid,
      language: props.language,
    },
  })
}
</script>
