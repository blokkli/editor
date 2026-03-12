<template>
  <div
    ref="providerEl"
    :data-provider-uuid="entityUuid"
    :data-provider-entity-type="entityType"
    :data-provider-entity-bundle="entityBundle"
    :data-blokkli-provider-active="isInEditor ? 'true' : 'false'"
  >
    <ClientOnly v-if="isInEditor">
      <BlokkliRootErrorBoundary>
        <PreviewProvider
          v-if="isPreviewing"
          v-slot="{ mutatedEntity }"
          :entity
          :entity-type
          :entity-uuid
          :entity-bundle
          :language
          :provider-type
        >
          <slot
            :entity="mutatedEntity"
            :is-editing
            :can-edit
            :is-preview="isPreviewing"
          />
        </PreviewProvider>
        <EditProvider
          v-else-if="isEditing && shouldRender && providerEl"
          v-slot="{ mutatedEntity }"
          :provider-el
          :entity
          :entity-type
          :entity-uuid
          :entity-bundle
          :language
          :isolate
          :permissions
          :provider-type
        >
          <slot
            :is-editing
            :can-edit
            :is-preview="isPreviewing"
            :entity="mutatedEntity"
          />
        </EditProvider>
      </BlokkliRootErrorBoundary>
      <EditIndicator
        v-if="showIndicator"
        :uuid="entityUuid"
        :entity-type
        :edit-label
        :permissions
        @edit="edit"
      />
    </ClientOnly>

    <slot
      v-else
      :is-editing
      :can-edit
      :is-preview="isPreviewing"
      :entity="entity as any"
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
  useTemplateRef,
} from '#imports'
import {
  INJECT_ENTITY_CONTEXT,
  INJECT_PROVIDER_CONTEXT,
  INJECT_PROVIDER_TYPE,
} from '../helpers/injections'
import type { EntityContext } from '#blokkli/types'
import type {
  BlokkliProviderEntityContext,
  EditPermission,
} from '#blokkli/types/provider'
import type { ValidProviderTypes } from '#blokkli-build/generated-types'

type BlokkliProviderProps = {
  /**
   * The entity type.
   */
  entityType: string

  /**
   * The entity bundle.
   */
  entityBundle: string

  /**
   * The entity UUID.
   */
  entityUuid: string

  /**
   * The tag to use for the root element.
   */
  tag?: string

  /**
   * The current language code.
   */
  language?: string

  /**
   * The override label for the edit button.
   */
  editLabel?: string

  /**
   * The path to use to open the editor. Defaults to the current route.path value.
   */
  editPath?: string

  /**
   * The host options as a key value object.
   */
  hostOptions?: Record<string, any>

  /**
   * The edit permissions.
   */
  permissions?: Array<EditPermission | null>

  /**
   * Whether to isolate the provider element during editing.
   */
  isolate?: boolean

  /**
   * The provider type.
   *
   * @default "default"
   */
  providerType?: ValidProviderTypes
}

const props = withDefaults(
  defineProps<
    BlokkliProviderProps &
      (
        | {
            /**
             * The entity data. Will be merged with the mutatedEntity data during editing.
             */

            entity: T
          }
        | {
            /**
             * The entity data. Will be merged with the mutatedEntity data during editing.
             */
            entity?: never
          }
      )
  >(),
  {
    tag: 'div',
    language: '',
    editLabel: '',
    editPath: undefined,
    hostOptions: undefined,
    entity: undefined,
    providerType: 'default',
    permissions: () => [],
  },
)

defineSlots<{
  default(props: {
    isEditing: boolean
    canEdit: boolean
    isPreview: boolean
    entity: T
  }): any
}>()

const isClient = import.meta.client

const providerEl = useTemplateRef('providerEl')

// Guard editor imports with import.meta.client so the server build
// tree-shakes the entire editor — these components only render inside
// <ClientOnly> and are never needed during SSR.
const PreviewProvider = import.meta.client
  ? defineAsyncComponent(
      () => import('./../editor/components/PreviewProvider.vue'),
    )
  : null

const EditProvider = import.meta.client
  ? defineAsyncComponent(
      () => import('./../editor/components/EditProvider.vue'),
    )
  : null

const BlokkliRootErrorBoundary = import.meta.client
  ? defineAsyncComponent(
      () => import('./../editor/components/BlokkliRootErrorBoundary.vue'),
    )
  : ('div' as never)

const EditIndicator = import.meta.client
  ? defineAsyncComponent(
      () => import('./../editor/components/EditIndicator.vue'),
    )
  : ('div' as never)

const route = useRoute()
const router = useRouter()

const shouldRender = ref(false)

const isInEditor = computed<boolean>(
  () =>
    isClient &&
    !!props.entityUuid &&
    !!props.entityType &&
    !!props.entityBundle &&
    (isPreviewing.value || isEditing.value),
)

const canEdit = computed<boolean>(() => props.permissions.includes('edit'))

const canUseBlokkli = computed<boolean>(() => !!props.permissions.length)

const isEditing = computed<boolean>(
  () =>
    canUseBlokkli.value &&
    !!props.entityUuid &&
    route.query.blokkliEditing === props.entityUuid,
)

const isPreviewing = computed<boolean>(
  () => !!props.entityUuid && route.query.blokkliPreview === props.entityUuid,
)

const showIndicator = computed<boolean>(
  () =>
    !!props.permissions.length &&
    !route.query.blokkliEditing &&
    !route.query.blokkliPreview,
)

function edit(): void {
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
      providerType: props.providerType,
      uuid: props.entityUuid,
      type: props.entityType,
      bundle: props.entityBundle,
      language: props.language,
    }
  },
)

const entityContext = computed<EntityContext>(() => {
  return {
    uuid: props.entityUuid,
    type: props.entityType,
    bundle: props.entityBundle,
  }
})

provide(INJECT_PROVIDER_CONTEXT, blokkliProviderEntityContext)
provide(INJECT_ENTITY_CONTEXT, entityContext.value)
provide(INJECT_PROVIDER_TYPE, props.providerType)

onMounted(() => {
  shouldRender.value = true
})
</script>
