<template>
  <div :data-provider-uuid="entityUuid">
    <PbPreviewProvider
      v-if="isPreviewing"
      :entity-type="entityType"
      :entity-uuid="entityUuid"
      :bundle="bundle"
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
      :bundle="bundle"
    >
      <slot
        :is-editing="isEditing"
        :can-edit="canEdit"
        :is-preview="isPreviewing"
      ></slot>
    </PbEditProvider>

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
import { useDrupalUser } from '~/stores/drupalUser'

const PbPreviewProvider = defineAsyncComponent(() => {
  return import('./PreviewProvider.vue')
})

const PbEditProvider = defineAsyncComponent(() => {
  return import('./EditProvider.vue')
})

const PbEditIndicator = defineAsyncComponent(() => {
  return import('./EditIndicator.vue')
})

const route = useRoute()
const router = useRouter()
const drupalUser = useDrupalUser()
const language = useCurrentLanguage()

const props = withDefaults(
  defineProps<{
    entityType: string
    bundle: string
    entityUuid: string
    tag?: string
  }>(),
  {
    tag: 'div',
  },
)

const canEdit = computed(() => {
  return (
    props.entityUuid && props.entityType && drupalUser.canUseParagraphsBuilder
  )
})

const isEditing = computed(() => {
  return (
    canEdit.value &&
    props.entityUuid &&
    route.query.pbEditing === props.entityUuid
  )
})

const isPreviewing = computed(() => {
  return props.entityUuid && route.query.pbPreview === props.entityUuid
})

const showIndicator = computed(
  () => canEdit.value && !route.query.pbEditing && !route.query.pbPreview,
)

function edit() {
  router.push({
    query: {
      pbEditing: props.entityUuid,
      language: language.value,
    },
  })
}
</script>
