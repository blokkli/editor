import {
  type Ref,
  type ComputedRef,
  computed,
  ref,
  reactive,
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
import { falsy, getFieldKey } from '#blokkli/helpers'
import { eventBus, emitMessage } from '#blokkli/helpers/eventBus'
import { nextTick } from '#imports'
import type { TextProvider } from './textProvider'

export type BlokkliOwner = {
  name: string | undefined
  currentUserIsOwner: boolean
}

export type RenderedBlock = {
  item: FieldListItem
  parentEntityType: string
  parentEntityBundle: string
  parentEntityUuid: string
}

export type StateProvider = {
  owner: Readonly<Ref<BlokkliOwner | null>>
  refreshKey: Readonly<Ref<string>>
  mutatedFields: Readonly<Ref<MutatedField[]>>
  entity: Readonly<Ref<EditEntity>>
  mutatedOptions: MutatedOptions
  translation: Readonly<Ref<TranslationState>>
  mutations: Readonly<Ref<MutationItem[]>>
  currentMutationIndex: Readonly<Ref<number>>
  violations: Readonly<Ref<Validation[]>>
  mutateWithLoadingState: MutateWithLoadingStateFunction
  editMode: Readonly<Ref<EditMode>>
  mutatedEntity: Readonly<Ref<any>>
  canEdit: ComputedRef<boolean>
  isLoading: Readonly<Ref<boolean>>
  getFieldBlockCount: (key: string) => number
  getBlockBundleCount: (bundle: string) => number
  getFieldListItem: (uuid: string) => FieldListItem | undefined
  getFieldListForBlock: (uuid: string) => MutatedField | undefined
  getMutatedField: (uuid: string, fieldName: string) => MutatedField | undefined
}

export default async function (
  adapter: BlokkliAdapter<any>,
  context: ComputedRef<AdapterContext>,
  $t: TextProvider,
): Promise<StateProvider> {
  const owner = ref<BlokkliOwner | null>(null)
  const refreshKey = ref('')
  const mutatedFields = ref<MutatedField[]>([])
  const mutatedFieldsMap = reactive<Record<string, MutatedField | undefined>>(
    {},
  )
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
  let fieldBlockCount: Record<string, number> = {}
  const blockBundleCount: Ref<Record<string, number>> = ref({})
  const fieldListItemMap: Record<string, string> = {}

  function getFieldListItem(uuid: string): FieldListItem | undefined {
    const fieldKey = fieldListItemMap[uuid]
    if (!fieldKey) {
      return
    }

    const field = mutatedFieldsMap[fieldKey]

    if (!field) {
      return
    }

    return field.list.find((v) => v.uuid === uuid)
  }

  function getFieldListForBlock(uuid: string): MutatedField | undefined {
    const fieldKey = fieldListItemMap[uuid]
    if (!fieldKey) {
      return
    }

    return mutatedFieldsMap[fieldKey]
  }

  const mutatedOptions = reactive<MutatedOptions>({})
  const translation = ref<TranslationState>({
    isTranslatable: false,
    sourceLanguage: '',
    availableLanguages: [],
    translations: [],
  })

  function setContext(context?: MappedState) {
    const options = context?.mutatedState?.mutatedOptions || {}
    const optionKeys = Object.keys(options)

    for (let i = 0; i < optionKeys.length; i++) {
      const key = optionKeys[i]
      const newOptions = options[key]
      const existing = mutatedOptions[key]
      if (
        !existing ||
        JSON.stringify(existing) !== JSON.stringify(newOptions)
      ) {
        mutatedOptions[key] = newOptions
      }
    }
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

    const visitedFieldKeys: string[] = []
    const newBlockBundleCount: Record<string, number> = {}

    // Reset the count cache.
    fieldBlockCount = {}
    for (let i = 0; i < newMutatedFields.length; i++) {
      const field = newMutatedFields[i]
      const key = getFieldKey(field.entityUuid, field.name)
      visitedFieldKeys.push(key)

      const existing = mutatedFieldsMap[key]
      if (
        !existing ||
        existing.list.length !== field.list.length ||
        JSON.stringify(existing.list) !== JSON.stringify(field.list)
      ) {
        mutatedFieldsMap[key] = field
      }

      for (let j = 0; j < field.list.length; j++) {
        const item = field.list[j]

        if (!newBlockBundleCount[item.bundle]) {
          newBlockBundleCount[item.bundle] = 0
        }
        newBlockBundleCount[item.bundle]++
        fieldListItemMap[item.uuid] = key
      }
    }

    blockBundleCount.value = newBlockBundleCount

    const existingKeys = Object.keys(mutatedFieldsMap)

    for (let i = 0; i < existingKeys.length; i++) {
      const key = existingKeys[i]
      if (!visitedFieldKeys.includes(key)) {
        mutatedFieldsMap[key] = undefined
      }
    }

    eventBus.emit('updateMutatedFields', { fields: newMutatedFields })

    nextTick(() => {
      refreshKey.value = Date.now().toString()
      eventBus.emit('state:reloaded')
    })
  }

  function getMutatedField(entityUuid: string, fieldName: string) {
    const key = getFieldKey(entityUuid, fieldName)
    return mutatedFieldsMap[key]
  }

  function getBlockBundleCount(bundle: string): number {
    return blockBundleCount.value[bundle] || 0
  }

  function getFieldBlockCount(key: string) {
    // Return a cached value.
    if (fieldBlockCount[key] !== undefined) {
      return fieldBlockCount[key]
    }

    // Get the value and cache it.
    const count = mutatedFieldsMap[key]?.list.length || 0
    fieldBlockCount[key] = count
    return count
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
    callback,
    errorMessage,
    successMessage,
  ) => {
    if (!callback) {
      return true
    }
    lockBody()
    try {
      const promise = callback()
      const result = await promise
      if (!result) {
        throw new Error('Unexpected error')
      }
      unlockBody()
      if (result.state) {
        setContext(adapter.mapState(result.state))
      }

      if (!result.success) {
        const errorMessage =
          result.errors?.join('\n') ||
          $t('unexpectedMutationError', 'An unexpected error happened.')
        throw new Error(errorMessage)
      }

      if (successMessage) {
        emitMessage(successMessage)
      }
      return true
    } catch (e) {
      emitMessage(
        errorMessage ||
          $t('unexpectedMutationError', 'An unexpected error happened.'),
        'error',
        e,
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
    () =>
      context.value.language !== translation.value.sourceLanguage &&
      translation.value.isTranslatable,
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

  onBlokkliEvent('reloadState', async () => {
    await loadState()
  })

  onBlokkliEvent('reloadEntity', async (cb) => {
    await refreshNuxtData()
    await loadState()
    if (cb) {
      cb()
    }
  })

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
    mutatedEntity,
    getFieldBlockCount,
    getBlockBundleCount,
    getFieldListItem,
    getMutatedField,
    getFieldListForBlock,
  }
}
