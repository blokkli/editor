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
import { PbAdapter } from '../types/adapter'

export default function (adapter: PbAdapter<any>) {
  const refreshKey = ref('')
  const currentUserIsOwner = ref(false)
  const ownerName = ref('')
  const mutatedFields = ref<PbMutatedField[]>([])
  const mutations = ref<PbMutation[]>([])
  const violations = ref<PbViolation[]>([])
  const currentMutationIndex = ref(-1)
  const previewGrantUrl = ref('')
  const isLoading = ref(false)
  const entity = ref<PbEditEntity>({
    id: undefined,
    changed: undefined,
    status: false,
    translations: [],
  })

  const mutatedParagraphOptions = ref<MutatedParagraphOptions>({})
  const translationState = ref<PbTranslationState>({
    isTranslatable: false,
    sourceLanguage: '',
    availableLanguages: [],
    translations: [],
  })

  function setContext(context?: PbEditState) {
    removeDroppedElements()

    mutatedParagraphOptions.value =
      context?.mutatedState?.behaviorSettings || {}
    mutations.value = context?.mutations || []
    violations.value = context?.mutatedState?.violations || []
    const currentIndex = context?.currentIndex
    currentMutationIndex.value = currentIndex === undefined ? -1 : currentIndex
    currentUserIsOwner.value = !!context?.currentUserIsOwner
    ownerName.value = context?.ownerName || ''
    entity.value.id = context?.entity?.id
    entity.value.changed = context?.entity?.changed
    entity.value.label = context?.entity?.label
    entity.value.status = context?.entity?.status
    entity.value.translations = context?.entity?.translations || []
    entity.value.bundleLabel = context?.entity?.bundleLabel || ''
    entity.value.editUrl = context?.entity.editUrl
    previewGrantUrl.value = context?.previewUrl || ''

    translationState.value.isTranslatable =
      !!context?.translationState?.isTranslatable
    translationState.value.translations =
      context?.translationState?.translations?.filter(falsy) || []
    translationState.value.sourceLanguage =
      context?.translationState?.sourceLanguage || ''
    translationState.value.availableLanguages =
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

  async function loadState(langcode?: string | undefined | null) {
    const state = await adapter.loadState(langcode)
    if (state) {
      setContext(adapter.mapState(state))
    }
  }

  async function onReloadState() {
    removeDroppedElements()
    await loadState(currentLanguage.value)
  }

  async function onReloadEntity() {
    await refreshNuxtData()
    await loadState(currentLanguage.value)
  }

  const route = useRoute()
  const router = useRouter()

  const currentLanguage = computed({
    get() {
      const v = route.query.language
      if (v && typeof v === 'string') {
        return v
      }
      return translationState.value.sourceLanguage
    },
    set(language) {
      const path = entity.value.translations.find(
        (v) => v.langcode === language,
      )?.url
      if (path) {
        router.replace({
          path,
          query: {
            ...route.query,
            language,
          },
        })
      }
      loadState(language)
    },
  })
  const canEdit = computed(() => currentUserIsOwner.value)
  const isTranslation = computed(
    () => currentLanguage.value !== translationState.value.sourceLanguage,
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

  return {
    refreshKey,
    currentUserIsOwner,
    ownerName,
    mutatedFields,
    entity,
    mutatedParagraphOptions,
    translationState,
    mutations,
    violations,
    currentMutationIndex,
    previewGrantUrl,
    setContext,
    mutateWithLoadingState,
    loadState,
    editMode,
    currentLanguage,
    canEdit,
  }
}
