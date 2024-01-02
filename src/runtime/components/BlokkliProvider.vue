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

    <EditIndicator
      v-if="showIndicator"
      :uuid="entityUuid"
      :edit-label="editLabel"
      @edit="edit"
    />
  </div>
</template>

<script lang="ts" setup>
import {
  computed,
  defineAsyncComponent,
  useRoute,
  useRouter,
  provide,
} from '#imports'
import { INJECT_ENTITY_CONTEXT } from '../helpers/symbols'

const PreviewProvider = defineAsyncComponent(
  () => import('./Edit/PreviewProvider.vue'),
)

const EditProvider = defineAsyncComponent(
  () => import('./Edit/EditProvider.vue'),
)

const EditIndicator = defineAsyncComponent(
  () => import('./Edit/EditIndicator.vue'),
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
    editLabel?: string
  }>(),
  {
    tag: 'div',
    language: '',
    editLabel: '',
  },
)

const isInEditor = computed(
  () =>
    props.entityUuid &&
    props.entityType &&
    props.entityBundle &&
    (isPreviewing.value || isEditing.value),
)

const isEditing = computed(
  () =>
    props.canEdit &&
    !!props.entityUuid &&
    route.query.blokkliEditing === props.entityUuid,
)

const isPreviewing = computed(
  () => props.entityUuid && route.query.blokkliPreview === props.entityUuid,
)

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

provide(INJECT_ENTITY_CONTEXT, {
  uuid: props.entityUuid,
  type: props.entityType,
  bundle: props.entityBundle,
})
</script>
