<template>
  <component :is="tag">
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
  </component>
</template>

<script lang="ts" setup>
import { useDrupalUser } from '~/stores/drupalUser'

const PbPreviewProvider = defineAsyncComponent(() => {
  return import('./PreviewProvider.vue')
})

const PbEditProvider = defineAsyncComponent(() => {
  return import('./EditProvider.vue')
})

const route = useRoute()
const drupalUser = useDrupalUser()

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
</script>
