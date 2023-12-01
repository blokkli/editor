import type {
  PbMutatedField,
  PbEditEntity,
  MutatedParagraphOptions,
  PbTranslationState,
  PbEditState,
  PbMutation,
  PbViolation,
  PbMutateWithLoadingState,
  PbEditMode,
} from '#pb/types'
import { removeDroppedElements, falsy } from '#pb/helpers'
import { emitMessage, eventBus } from '../eventBus'
import { PbAdapter, PbAdapterContext } from '../adapter'
import { INJECT_MUTATED_FIELDS } from './symbols'

export type PbStateOwner = {
  name: string | undefined
  currentUserIsOwner: boolean
}

export type PbStateProvider = {
  owner: Readonly<Ref<PbStateOwner | null>>
  refreshKey: Readonly<Ref<string>>
  mutatedFields: Readonly<Ref<PbMutatedField[]>>
  entity: Readonly<Ref<PbEditEntity>>
  mutatedOptions: Ref<MutatedParagraphOptions>
  translation: Readonly<Ref<PbTranslationState>>
  mutations: Readonly<Ref<PbMutation[]>>
  currentMutationIndex: Readonly<Ref<number>>
  violations: Readonly<Ref<PbViolation[]>>
  mutateWithLoadingState: PbMutateWithLoadingState
  editMode: Readonly<Ref<PbEditMode>>
  canEdit: ComputedRef<boolean>
}

export default async function (
  adapter: PbAdapter<any>,
  context: ComputedRef<PbAdapterContext>,
): Promise<PbStateProvider> {
  const owner = ref<PbStateOwner | null>(null)
  const refreshKey = ref('')
  const mutatedFields = ref<PbMutatedField[]>([])
  const mutations = ref<PbMutation[]>([])
  const violations = ref<PbViolation[]>([])
  const currentMutationIndex = ref(-1)
  const isLoading = ref(false)
  const entity = ref<PbEditEntity>({
    id: undefined,
    changed: undefined,
    status: false,
  })

  const mutatedOptions = ref<MutatedParagraphOptions>({})
  const translation = ref<PbTranslationState>({
    isTranslatable: false,
    sourceLanguage: '',
    availableLanguages: [],
    translations: [],
  })

  function setContext(context?: PbEditState) {
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
    document.body.classList.add('pb-body-loading')
    isLoading.value = true
  }

  function unlockBody() {
    document.body.classList.remove('pb-body-loading')
    isLoading.value = false
  }

  const mutateWithLoadingState: PbMutateWithLoadingState = async (
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

  const editMode = computed<PbEditMode>(() => {
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
