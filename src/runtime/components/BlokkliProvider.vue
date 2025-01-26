<template>
  <div
    :data-provider-uuid="entityUuid"
    :data-provider-entity-type="entityType"
    :data-provider-entity-bundle="entityBundle"
    :data-blokkli-provider-active="isInEditor || undefined"
  >
    <BlokkliErrorBoundary v-if="isInEditor">
      <PreviewProvider
        v-if="isPreviewing"
        v-slot="{ mutatedEntity }"
        :entity="entity"
        :entity-type="entityType"
        :entity-uuid="entityUuid"
        :entity-bundle="entityBundle"
        :language="language"
      >
        <slot
          :entity="mutatedEntity"
          :is-editing="isEditing"
          :can-edit="canEdit"
          :is-preview="isPreviewing"
        />
      </PreviewProvider>
      <EditProvider
        v-else-if="isEditing && shouldRender"
        v-slot="{ mutatedEntity }"
        :entity="entity"
        :entity-type="entityType"
        :entity-uuid="entityUuid"
        :entity-bundle="entityBundle"
        :language="language"
        :isolate="isolate"
      >
        <slot
          :is-editing="isEditing"
          :can-edit="canEdit"
          :is-preview="isPreviewing"
          :entity="mutatedEntity"
        />
      </EditProvider>
    </BlokkliErrorBoundary>

    <slot
      v-else
      :is-editing="isEditing"
      :can-edit="canEdit"
      :is-preview="isPreviewing"
      :entity="entity"
    />

    <EditIndicator
      v-if="showIndicator"
      :uuid="entityUuid"
      :edit-label="editLabel"
      @edit="edit"
    />
  </div>
</template>

<script lang="ts" setup generic="T">
import {
  computed,
  defineAsyncComponent,
  useRoute,
  useRouter,
  provide,
  ref,
  onMounted,
} from '#imports'
import {
  INJECT_ENTITY_CONTEXT,
  INJECT_PROVIDER_CONTEXT,
} from '../helpers/symbols'
import type { BlokkliProviderEntityContext } from '#blokkli/types'

const PreviewProvider = defineAsyncComponent(
  () => import('./Edit/PreviewProvider.vue'),
)

const EditProvider = defineAsyncComponent(
  () => import('./Edit/EditProvider.vue'),
)

const BlokkliErrorBoundary = defineAsyncComponent(
  () => import('./Edit/BlokkliErrorBoundary.vue'),
)

const EditIndicator = defineAsyncComponent(
  () => import('./Edit/EditIndicator.vue'),
)

const route = useRoute()
const router = useRouter()

const props = withDefaults(
  defineProps<{
    entity?: T
    entityType: string
    entityBundle: string
    entityUuid: string
    canEdit: boolean
    tag?: string
    language?: string
    editLabel?: string
    editPath?: string

    /**
     * When set to true, during editing, everything except the provider element will be hidden.
     */
    isolate?: boolean
  }>(),
  {
    tag: 'div',
    language: '',
    editLabel: '',
    entity: undefined,
    editPath: undefined,
  },
)

const shouldRender = ref(false)

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
    path: props.editPath || route.path,
    query: {
      blokkliEditing: props.entityUuid,
      language: props.language,
    },
  })
}

const blokkliProviderEntityContext = computed<BlokkliProviderEntityContext>(
  () => {
    return {
      uuid: props.entityUuid,
      type: props.entityType,
      bundle: props.entityBundle,
      language: props.language,
    }
  },
)

provide(INJECT_PROVIDER_CONTEXT, blokkliProviderEntityContext)
provide(INJECT_ENTITY_CONTEXT, {
  uuid: props.entityUuid,
  type: props.entityType,
  bundle: props.entityBundle,
})

onMounted(() => {
  shouldRender.value = true
})
</script>
