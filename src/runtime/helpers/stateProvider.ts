import {
  type Ref,
  type ComputedRef,
  computed,
  ref,
  readonly,
  provide,
} from 'vue'
import { refreshNuxtData } from 'nuxt/app'
import type { BlokkliAdapter, AdapterContext } from '../adapter'
import { INJECT_MUTATED_FIELDS_MAP } from './symbols'
import onBlokkliEvent from './composables/onBlokkliEvent'
import type {
  MutatedField,
  EditEntity,
  MutatedOptions,
  TranslationState,
  MappedState,
  MutationItem,
  Validation,
  MutateWithLoadingStateFunction,
  EditMode,
  FieldListItem,
} from '#blokkli/types'
import { removeDroppedElements, falsy, getFieldKey } from '#blokkli/helpers'
import { eventBus, emitMessage } from '#blokkli/helpers/eventBus'
import { nextTick, useRuntimeConfig } from '#imports'

const itemEntityType = useRuntimeConfig().public.blokkli.itemEntityType

export type BlokkliOwner = {
  name: string | undefined
  currentUserIsOwner: boolean
}

export type RenderedBlock = {
  item: FieldListItem
  parentEntityType: string
  parentEntityBundle: String
  parentEntityUuid: string
}

export type StateProvider = {
  owner: Readonly<Ref<BlokkliOwner | null>>
  refreshKey: Readonly<Ref<string>>
  mutatedFields: Readonly<Ref<MutatedField[]>>
  entity: Readonly<Ref<EditEntity>>
  mutatedOptions: Ref<MutatedOptions>
  translation: Readonly<Ref<TranslationState>>
  mutations: Readonly<Ref<MutationItem[]>>
  currentMutationIndex: Readonly<Ref<number>>
  violations: Readonly<Ref<Validation[]>>
  mutateWithLoadingState: MutateWithLoadingStateFunction
  editMode: Readonly<Ref<EditMode>>
  mutatedEntity: Readonly<Ref<any>>
  canEdit: ComputedRef<boolean>
  isLoading: Readonly<Ref<boolean>>
  renderedBlocks: ComputedRef<RenderedBlock[]>
  getRenderedBlock: (uuid: string) => RenderedBlock | undefined
}

export default async function (
  adapter: BlokkliAdapter<any>,
  context: ComputedRef<AdapterContext>,
): Promise<StateProvider> {
  const owner = ref<BlokkliOwner | null>(null)
  const refreshKey = ref('')
  const mutatedFields = ref<MutatedField[]>([])
  const mutations = ref<MutationItem[]>([])
  const violations = ref<Validation[]>([])
  const mutatedEntity = ref<any>(null)
  const currentMutationIndex = ref(-1)
  const isLoading = ref(false)
  const entity = ref<EditEntity>({
    label: '',
    status: false,
    bundleLabel: '',
  })

  const mutatedOptions = ref<MutatedOptions>({})
  const translation = ref<TranslationState>({
    isTranslatable: false,
    sourceLanguage: '',
    availableLanguages: [],
    translations: [],
  })

  const blockUuidMap = computed<Record<string, FieldListItem>>(() => {
    return mutatedFields.value
      .flatMap((v) => v.list)
      .reduce<Record<string, FieldListItem>>((acc, v) => {
        acc[v.uuid] = v
        return acc
      }, {})
  })

  const renderedBlocks = computed<RenderedBlock[]>(() => {
    return mutatedFields.value.flatMap((field) => {
      return field.list.map((item) => {
        return {
          item,
          parentEntityType: field.entityType,
          parentEntityUuid: field.entityUuid,
          parentEntityBundle:
            field.entityType === itemEntityType
              ? blockUuidMap.value[field.entityUuid]?.bundle
              : context.value.entityBundle,
        }
      })
    })
  })

  function setContext(context?: MappedState) {
    removeDroppedElements()

    mutatedOptions.value = context?.mutatedState?.mutatedOptions || {}
    mutations.value = context?.mutations || []
    violations.value = context?.mutatedState?.violations || []
    const currentIndex = context?.currentIndex
    currentMutationIndex.value = currentIndex === undefined ? -1 : currentIndex
    owner.value = {
      name: context?.ownerName,
      currentUserIsOwner: !!context?.currentUserIsOwner,
    }
    entity.value.label = context?.entity?.label
    entity.value.status = context?.entity?.status
    entity.value.bundleLabel = context?.entity?.bundleLabel || ''

    translation.value.isTranslatable =
      !!context?.translationState?.isTranslatable
    translation.value.translations =
      context?.translationState?.translations?.filter(falsy) || []
    translation.value.sourceLanguage =
      context?.translationState?.sourceLanguage || ''
    translation.value.availableLanguages =
      context?.translationState?.availableLanguages || []

    const newMutatedFields = (context?.mutatedState?.fields || []).map(
      (field) => {
        return {
          ...field,
          list: field.list.filter(falsy),
        }
      },
    )
    mutatedFields.value = newMutatedFields
    mutatedEntity.value = context?.mutatedEntity

    eventBus.emit('updateMutatedFields', { fields: newMutatedFields })

    eventBus.emit('state:reloaded')
    nextTick(() => {
      refreshKey.value = Date.now().toString()
    })
  }

  function lockBody() {
    document.body.classList.add('bk-body-loading')
    isLoading.value = true
  }

  function unlockBody() {
    document.body.classList.remove('bk-body-loading')
    isLoading.value = false
  }

  const mutateWithLoadingState: MutateWithLoadingStateFunction = async (
    promise,
    errorMessage,
    successMessage,
  ) => {
    if (!promise) {
      return true
    }
    lockBody()
    try {
      const result = await promise
      unlockBody()
      if (result.state) {
        setContext(adapter.mapState(result.state))
      }

      if (!result.success) {
        throw new Error('Unexpected error.')
      }

      if (successMessage) {
        emitMessage(successMessage)
      }
      return true
    } catch (_e) {
      emitMessage(
        errorMessage || 'Es ist ein unerwarteter Fehler aufgetreten.',
        'error',
      )
    }

    unlockBody()
    return false
  }

  async function loadState() {
    const state = await adapter.loadState()
    if (state) {
      setContext(adapter.mapState(state))
    }
  }

  const canEdit = computed(() => !!owner.value?.currentUserIsOwner)
  const isTranslation = computed(
    () => context.value.language !== translation.value.sourceLanguage,
  )

  const editMode = computed<EditMode>(() => {
    if (!canEdit.value) {
      return 'readonly'
    }
    if (isTranslation.value) {
      return 'translating'
    }

    return 'editing'
  })

  const getRenderedBlock: StateProvider['getRenderedBlock'] = (uuid) =>
    renderedBlocks.value.find((v) => v.item.uuid === uuid)

  onBlokkliEvent('reloadState', async () => {
    removeDroppedElements()
    await loadState()
  })

  onBlokkliEvent('reloadEntity', async () => {
    await refreshNuxtData()
    await loadState()
  })

  const mutatedFieldsMap = computed(() =>
    mutatedFields.value.reduce<Record<string, MutatedField>>((acc, field) => {
      const key = getFieldKey(field.entityUuid, field.name)
      acc[key] = field
      return acc
    }, {}),
  )

  provide(INJECT_MUTATED_FIELDS_MAP, mutatedFieldsMap)

  await loadState()

  return {
    refreshKey,
    owner: readonly(owner),
    mutatedFields,
    entity,
    mutatedOptions,
    translation,
    mutations,
    violations,
    currentMutationIndex,
    mutateWithLoadingState,
    editMode,
    canEdit,
    isLoading: readonly(isLoading),
    renderedBlocks,
    getRenderedBlock,
    mutatedEntity,
  }
}
