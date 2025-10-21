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
        :entity
        :entity-type
        :entity-uuid
        :entity-bundle
        :language
      >
        <slot
          :entity="mutatedEntity"
          :is-editing
          :can-edit
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
        :permissions
      >
        <slot
          :is-editing
          :can-edit
          :is-preview="isPreviewing"
          :entity="mutatedEntity"
        />
      </EditProvider>
    </BlokkliErrorBoundary>

    <slot
      v-else
      :is-editing
      :can-edit
      :is-preview="isPreviewing"
      :entity="entity as any"
    />

    <ClientOnly>
      <EditIndicator
        v-if="showIndicator"
        :uuid="entityUuid"
        :entity-type
        :edit-label
        :permissions
        @edit="edit"
      />
    </ClientOnly>
  </div>
</template>

<script lang="ts" setup generic="T extends object">
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
import type {
  BlokkliProviderEntityContext,
  EditPermission,
} from '#blokkli/types'

defineSlots<{
  default(props: {
    isEditing: boolean
    canEdit: boolean
    isPreview: boolean
    entity?: T | undefined
  }): any
}>()

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
    tag?: string
    language?: string
    editLabel?: string
    editPath?: string
    hostOptions?: any
    permissions?: EditPermission[]

    // @todo: edit icon for indicator

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
    hostOptions: undefined,
    permissions: () => {
      return []
    },
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

const canEdit = computed(() => props.permissions.includes('edit'))

const canUseBlokkli = computed<boolean>(() => !!props.permissions.length)

const isEditing = computed(
  () =>
    canUseBlokkli.value &&
    !!props.entityUuid &&
    route.query.blokkliEditing === props.entityUuid,
)

const isPreviewing = computed(
  () => !!props.entityUuid && route.query.blokkliPreview === props.entityUuid,
)

const showIndicator = computed(
  () =>
    !!props.permissions.length &&
    !route.query.blokkliEditing &&
    !route.query.blokkliPreview,
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
