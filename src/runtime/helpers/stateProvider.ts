import type {
  BlokkliMutatedField,
  BlokkliEditEntity,
  MutatedOptions,
  BlokkliTranslationState,
  BlokkliMappedState,
  BlokkliMutationItem,
  BlokkliValidation,
  MutateWithLoadingStateFunction,
  BlokkliEditMode,
} from '#blokkli/types'
import { removeDroppedElements, falsy } from '#blokkli/helpers'
import { eventBus, emitMessage } from '#blokkli/helpers/eventBus'
import type { BlokkliAdapter, BlokkliAdapterContext } from '../adapter'
import { INJECT_MUTATED_FIELDS } from './symbols'

export type BlokkliOwner = {
  name: string | undefined
  currentUserIsOwner: boolean
}

export type BlokkliStateProvider = {
  owner: Readonly<globalThis.Ref<BlokkliOwner | null>>
  refreshKey: Readonly<globalThis.Ref<string>>
  mutatedFields: Readonly<globalThis.Ref<BlokkliMutatedField[]>>
  entity: Readonly<globalThis.Ref<BlokkliEditEntity>>
  mutatedOptions: globalThis.Ref<MutatedOptions>
  translation: Readonly<globalThis.Ref<BlokkliTranslationState>>
  mutations: Readonly<globalThis.Ref<BlokkliMutationItem[]>>
  currentMutationIndex: Readonly<globalThis.Ref<number>>
  violations: Readonly<globalThis.Ref<BlokkliValidation[]>>
  mutateWithLoadingState: MutateWithLoadingStateFunction
  editMode: Readonly<globalThis.Ref<BlokkliEditMode>>
  canEdit: globalThis.ComputedRef<boolean>
}

export default async function (
  adapter: BlokkliAdapter<any>,
  context: globalThis.ComputedRef<BlokkliAdapterContext>,
): Promise<BlokkliStateProvider> {
  const owner = ref<BlokkliOwner | null>(null)
  const refreshKey = ref('')
  const mutatedFields = ref<BlokkliMutatedField[]>([])
  const mutations = ref<BlokkliMutationItem[]>([])
  const violations = ref<BlokkliValidation[]>([])
  const currentMutationIndex = ref(-1)
  const isLoading = ref(false)
  const entity = ref<BlokkliEditEntity>({
    id: undefined,
    changed: undefined,
    status: false,
  })

  const mutatedOptions = ref<MutatedOptions>({})
  const translation = ref<BlokkliTranslationState>({
    isTranslatable: false,
    sourceLanguage: '',
    availableLanguages: [],
    translations: [],
  })

  function setContext(context?: BlokkliMappedState) {
    removeDroppedElements()

    mutatedOptions.value = context?.mutatedState?.behaviorSettings || {}
    mutations.value = context?.mutations || []
    violations.value = context?.mutatedState?.violations || []
    const currentIndex = context?.currentIndex
    currentMutationIndex.value = currentIndex === undefined ? -1 : currentIndex
    owner.value = {
      name: context?.ownerName,
      currentUserIsOwner: !!context?.currentUserIsOwner,
    }
    entity.value.id = context?.entity?.id
    entity.value.changed = context?.entity?.changed
    entity.value.label = context?.entity?.label
    entity.value.status = context?.entity?.status
    entity.value.bundleLabel = context?.entity?.bundleLabel || ''
    entity.value.editUrl = context?.entity.editUrl

    translation.value.isTranslatable =
      !!context?.translationState?.isTranslatable
    translation.value.translations =
      context?.translationState?.translations?.filter(falsy) || []
    translation.value.sourceLanguage =
      context?.translationState?.sourceLanguage || ''
    translation.value.availableLanguages =
      context?.translationState?.availableLanguages || []

    const newMutatedFields = context?.mutatedState?.fields || []
    mutatedFields.value = newMutatedFields

    eventBus.emit('updateMutatedFields', { fields: newMutatedFields })

    refreshKey.value = Date.now().toString()
    eventBus.emit('state:reloaded')
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
      if (result.data.state?.action?.state) {
        setContext(adapter.mapState(result.data.state?.action?.state))
      } else if (!result.data.state?.action?.success) {
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

  async function onReloadState() {
    removeDroppedElements()
    await loadState()
  }

  async function onReloadEntity() {
    await refreshNuxtData()
    await loadState()
  }

  const canEdit = computed(() => !!owner.value?.currentUserIsOwner)
  const isTranslation = computed(
    () => context.value.language !== translation.value.sourceLanguage,
  )

  const editMode = computed<BlokkliEditMode>(() => {
    if (!canEdit.value) {
      return 'readonly'
    }
    if (isTranslation.value) {
      return 'translating'
    }

    return 'editing'
  })

  onMounted(() => {
    eventBus.on('reloadState', onReloadState)
    eventBus.on('reloadEntity', onReloadEntity)
  })

  onBeforeUnmount(() => {
    eventBus.off('reloadState', onReloadState)
    eventBus.off('reloadEntity', onReloadEntity)
  })

  provide(
    INJECT_MUTATED_FIELDS,
    computed(() => mutatedFields.value),
  )

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
  }
}
