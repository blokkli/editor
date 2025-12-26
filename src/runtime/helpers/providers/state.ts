import {
  type Ref,
  type ComputedRef,
  computed,
  ref,
  reactive,
  readonly,
  provide,
} from 'vue'
import { refreshNuxtData, useState } from 'nuxt/app'
import type { BlokkliAdapter, AdapterContext } from '../../adapter'
import { INJECT_MUTATED_FIELDS_MAP } from '../injections'
import onBlokkliEvent from '../composables/onBlokkliEvent'
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
  PublishOptions,
  EditPermission,
  MutatedItemProps,
} from '#blokkli/types'
import { falsy, getFieldKey } from '#blokkli/helpers'
import { eventBus, emitMessage } from '#blokkli/helpers/eventBus'
import { nextTick } from '#imports'
import type { TextProvider } from './texts'
import { addElementClasses } from '../composables/addElementClasses'
import { BUNDLE_FROM_LIBRARY } from '../../../shared/constants'

const HOST_OPTION_KEY = 'HOST'

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

function mapPublishOptions(context?: MappedState): PublishOptions {
  return {
    canPublish: !!context?.publishOptions?.canPublish,
    isRevisionable: !!context?.publishOptions?.isRevisionable,
    hasRevisionLogMessage: !!context?.publishOptions?.hasRevisionLogMessage,
    canSchedule: !!context?.publishOptions?.canSchedule,
    lastChanged: context?.publishOptions?.lastChanged ?? null,
    publishOn: context?.publishOptions?.publishOn ?? null,
    revisionLogMessage: context?.publishOptions?.revisionLogMessage ?? null,
  }
}

export type StateProvider = {
  /**
   * Information about the editing session owner.
   *
   * Includes owner name and whether the current user is the owner.
   */
  owner: Readonly<Ref<BlokkliOwner | null>>

  /**
   * Refresh key that changes when state is reloaded.
   *
   * Use as a component key to force remounting when state updates.
   */
  refreshKey: Readonly<Ref<string>>

  /**
   * All mutated fields in the current editing session.
   *
   * Each field contains its entity context, field name, and list of blocks.
   */
  mutatedFields: Readonly<Ref<MutatedField[]>>

  /**
   * The host entity being edited.
   *
   * Contains label, status, and bundle information.
   */
  entity: Readonly<Ref<EditEntity>>

  /**
   * Mutated options for all blocks and the host entity.
   *
   * Maps block UUIDs (or 'HOST' for host options) to their option values.
   */
  mutatedOptions: MutatedOptions

  /**
   * Mutated item props for all blocks.
   *
   * Maps block UUIDs (or 'HOST' for host options) to prop value.
   */
  mutatedItemProps: MutatedItemProps

  /**
   * Translation state for the edited entity.
   *
   * Includes source language, available languages, and existing translations.
   */
  translation: Readonly<Ref<TranslationState>>

  /**
   * Publishing options and capabilities.
   *
   * Indicates whether publishing, scheduling, and revisions are available.
   */
  publishOptions: Readonly<Ref<PublishOptions>>

  /**
   * History of all mutations in the editing session.
   *
   * Used for undo/redo functionality and tracking changes.
   */
  mutations: Readonly<Ref<MutationItem[]>>

  /**
   * Current position in the mutation history.
   *
   * -1 indicates no mutations, 0+ indicates active mutation index.
   */
  currentMutationIndex: Readonly<Ref<number>>

  /**
   * Validation violations for the current state.
   *
   * Contains errors and warnings about invalid field values or configurations.
   */
  violations: Readonly<Ref<Validation[]>>

  /**
   * Execute a mutation with loading state and error handling.
   *
   * Shows loading indicator, handles errors, updates state, and shows messages.
   *
   * @param callback - Function that performs the mutation
   * @param errorMessage - Error message to show on failure (false to suppress)
   * @param successMessage - Optional success message to show
   * @returns True if successful, false if failed
   */
  mutateWithLoadingState: MutateWithLoadingStateFunction

  /**
   * Current edit mode.
   *
   * - 'readonly': User cannot edit (no permission or not owner)
   * - 'editing': User can edit
   * - 'translating': User is editing a translation
   */
  editMode: Readonly<Ref<EditMode>>

  /**
   * The raw mutated entity data from the adapter.
   *
   * Contains adapter-specific entity data (e.g., Drupal entity fields).
   */
  mutatedEntity: Readonly<Ref<any>>

  /**
   * Whether the current user can edit.
   *
   * True when state is loaded, user is owner, no load errors, and has edit permission.
   */
  canEdit: ComputedRef<boolean>

  /**
   * List of permissions for the current user.
   *
   * Includes 'edit', 'view', and other adapter-specific permissions.
   */
  permissions: ComputedRef<EditPermission[]>

  /**
   * Whether state has been successfully loaded.
   *
   * True when state loaded without errors.
   */
  stateAvailable: ComputedRef<boolean>

  /**
   * Whether a loading operation is in progress.
   *
   * Automatically adds 'bk-body-loading' class to document.body when true.
   */
  isLoading: Readonly<Ref<boolean>>

  /**
   * UUIDs of all blocks loaded from the library.
   *
   * Blocks with bundle 'from_library'.
   */
  fromLibraryUuids: Readonly<Ref<Readonly<string[]>>>

  /**
   * Get the number of blocks in a field.
   *
   * Results are cached for performance.
   *
   * @param key - The field key (entityUuid:fieldName)
   * @returns Number of blocks in the field
   */
  getFieldBlockCount: (key: string) => number

  /**
   * Get the total count of blocks with a specific bundle.
   *
   * @param bundle - The block bundle
   * @returns Total number of blocks with this bundle
   */
  getBlockBundleCount: (bundle: string) => number

  /**
   * Get a field list item by UUID.
   *
   * @param uuid - The block UUID
   * @returns The field list item, or undefined if not found
   */
  getFieldListItem: (uuid: string) => FieldListItem | undefined

  /**
   * Get the mutated field that contains a block.
   *
   * @param uuid - The block UUID
   * @returns The field containing this block, or undefined if not found
   */
  getFieldListForBlock: (uuid: string) => MutatedField | undefined

  /**
   * Get a mutated field by entity UUID and field name.
   *
   * @param uuid - The entity UUID
   * @param fieldName - The field name
   * @returns The mutated field, or undefined if not found
   */
  getMutatedField: (uuid: string, fieldName: string) => MutatedField | undefined

  /**
   * Get all block UUIDs, optionally filtered by bundle.
   *
   * @param bundle - Optional bundle to filter by
   * @returns Array of block UUIDs
   */
  getAllUuids: (bundle?: string) => string[]

  /**
   * Get the nesting level of a block.
   *
   * Level 0 = block in host entity field
   * Level 1 = block in another block's field
   * Level 2+ = deeper nesting
   *
   * @param uuid - The block UUID
   * @returns The nesting level (0+)
   */
  getNestingLevel: (uuid: string) => number

  /**
   * Check if a block is a child (direct or nested) of another block.
   *
   * Recursively checks parent relationships.
   *
   * @param childUuid - The potential child block UUID
   * @param parentUuid - The potential parent block UUID
   * @returns True if childUuid is a descendant of parentUuid
   */
  isChildOf: (childUuid: string, parentUuid: string) => boolean

  /**
   * Get the current mapped state.
   *
   * Throws error if called before state is available.
   *
   * @returns The current mapped state
   */
  getMappedState: () => MappedState

  /**
   * Temporarily override the state.
   *
   * Used for previewing changes without committing them.
   *
   * @param state - The temporary state to use
   */
  setOverrideState: (state: MappedState) => void

  /**
   * Clear the temporary override and restore previous state.
   *
   * Throws error if no override is active.
   */
  clearOverrideState: () => void

  /**
   * Get the field key for a block UUID.
   *
   * @param uuid - The block UUID
   * @returns The field key (entityUuid:fieldName), or null if not found
   */
  getFieldKeyForUuid: (uuid: string) => string | null

  /**
   * Get the parent entity UUID for a block.
   *
   * Returns the UUID of the entity that contains this block in one of its fields.
   * For nested blocks, this returns the parent block's UUID.
   * For root-level blocks, this returns the host entity's UUID.
   *
   * @param uuid - The block UUID
   * @returns The parent entity UUID, or null if block not found
   */
  getParentEntityUuid: (uuid: string) => string | null
}

export default async function (
  adapter: BlokkliAdapter<any>,
  context: ComputedRef<AdapterContext>,
  $t: TextProvider,
  providerKey: string,
  permissions: EditPermission[],
): Promise<StateProvider> {
  let _mappedState: MappedState | null = null
  const overrideHostOptions = useState('options:' + providerKey)
  const stateLoaded = ref(false)
  const stateLoadError = ref(false)
  const owner = ref<BlokkliOwner | null>(null)
  const refreshKey = ref('')
  const mutatedFields = ref<MutatedField[]>([])
  const mutatedFieldsMap = reactive<Record<string, MutatedField | undefined>>(
    {},
  )
  const mutations = ref<MutationItem[]>([])
  const violations = ref<Validation[]>([])
  const mutatedEntity = ref<any>(null)
  const publishOptions = ref<PublishOptions>({
    canPublish: false,
    isRevisionable: false,
    hasRevisionLogMessage: false,
    lastChanged: null,
    canSchedule: false,
    publishOn: null,
    revisionLogMessage: null,
  })
  const currentMutationIndex = ref(-1)
  const isLoading = ref(false)
  const entity = ref<EditEntity>({
    label: '',
    status: false,
    bundleLabel: '',
  })
  let fieldBlockCount: Record<string, number> = {}
  const blockBundleCount: Ref<Record<string, number>> = ref({})
  const fieldListItemMap = ref<Record<string, string>>({})
  let bundleToUuids: Record<string, string[]> = {}
  const fromLibraryUuids = ref<string[]>([])
  const nestingLevelMap: Map<string, number> = new Map()

  function getFieldListItem(uuid: string): FieldListItem | undefined {
    const fieldKey = fieldListItemMap.value[uuid]
    if (!fieldKey) {
      return
    }

    const field = mutatedFieldsMap[fieldKey]

    if (!field) {
      return
    }

    return field.list.find((v) => v.uuid === uuid)
  }

  function getFieldKeyForUuid(uuid: string): string | null {
    return fieldListItemMap.value[uuid] ?? null
  }

  function getParentEntityUuid(uuid: string): string | null {
    const field = getFieldListForBlock(uuid)
    return field?.entityUuid ?? null
  }

  function getFieldListForBlock(uuid: string): MutatedField | undefined {
    const fieldKey = fieldListItemMap.value[uuid]
    if (!fieldKey) {
      return
    }

    return mutatedFieldsMap[fieldKey]
  }

  const mutatedOptions = reactive<MutatedOptions>({})
  const mutatedItemProps = reactive<MutatedItemProps>({})
  const translation = ref<TranslationState>({
    isTranslatable: false,
    sourceLanguage: '',
    availableLanguages: [],
    translations: [],
  })

  function updatePublishOptions(newPublishOptions: PublishOptions) {
    publishOptions.value.canPublish = newPublishOptions.canPublish
    publishOptions.value.isRevisionable = newPublishOptions.isRevisionable
    publishOptions.value.hasRevisionLogMessage =
      newPublishOptions.hasRevisionLogMessage
    publishOptions.value.lastChanged = newPublishOptions.lastChanged
    publishOptions.value.canSchedule = newPublishOptions.canSchedule
    publishOptions.value.publishOn = newPublishOptions.publishOn
    publishOptions.value.revisionLogMessage =
      newPublishOptions.revisionLogMessage
  }

  function setContext(context?: MappedState, override?: boolean) {
    eventBus.emit('state:reload:before')

    if (!override) {
      _mappedState = context ?? null
    }
    const options = context?.mutatedState?.mutatedOptions || {}
    const optionKeys = Object.keys(options)

    for (let i = 0; i < optionKeys.length; i++) {
      const key = optionKeys[i]!
      const newOptions = options[key]
      const existing = mutatedOptions[key]
      if (
        !existing ||
        JSON.stringify(existing) !== JSON.stringify(newOptions)
      ) {
        mutatedOptions[key] = newOptions
      }
    }

    const hostOptions = context?.mutatedState?.mutatedHostOptions ?? {}
    const existing = mutatedOptions[HOST_OPTION_KEY]

    if (!existing || JSON.stringify(existing) !== JSON.stringify(hostOptions)) {
      mutatedOptions[HOST_OPTION_KEY] = hostOptions ?? ''
      overrideHostOptions.value = hostOptions
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

    updatePublishOptions(mapPublishOptions(context))

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

    fieldListItemMap.value = {}
    nestingLevelMap.clear()

    // Reset the count cache.
    fieldBlockCount = {}
    bundleToUuids = {}
    const fromLibrary: string[] = []
    for (let i = 0; i < newMutatedFields.length; i++) {
      const field = newMutatedFields[i]!
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
        const item = field.list[j]!

        if (!newBlockBundleCount[item.bundle]) {
          newBlockBundleCount[item.bundle] = 0
        }
        newBlockBundleCount[item.bundle]!++
        fieldListItemMap.value[item.uuid] = key
        if (!bundleToUuids[item.bundle]) {
          bundleToUuids[item.bundle] = []
        }
        bundleToUuids[item.bundle]!.push(item.uuid)
        if (item.bundle === BUNDLE_FROM_LIBRARY) {
          fromLibrary.push(item.uuid)
        }
      }
    }

    // Calculate nesting levels for all blocks
    for (let i = 0; i < newMutatedFields.length; i++) {
      const field = newMutatedFields[i]!
      for (let j = 0; j < field.list.length; j++) {
        const item = field.list[j]!
        calculateNestingLevel(item.uuid)
      }
    }

    blockBundleCount.value = newBlockBundleCount

    const existingKeys = Object.keys(mutatedFieldsMap)

    for (let i = 0; i < existingKeys.length; i++) {
      const key = existingKeys[i]!
      if (!visitedFieldKeys.includes(key)) {
        mutatedFieldsMap[key] = undefined
      }
    }

    fromLibraryUuids.value = fromLibrary

    // Clear item props overrides.
    const mutatedItemPropsUuids = Object.keys(mutatedItemProps)
    mutatedItemPropsUuids.forEach((uuid) => {
      mutatedItemProps[uuid] = undefined
    })

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
    isLoading.value = true
  }

  function unlockBody() {
    isLoading.value = false
  }

  function getAllUuids(bundle?: string): string[] {
    if (!bundle) {
      return [...Object.keys(fieldListItemMap.value)]
    }

    return bundleToUuids[bundle] ?? []
  }

  function calculateNestingLevel(uuid: string): number {
    // Check if already calculated
    const cached = nestingLevelMap.get(uuid)
    if (cached !== undefined) {
      return cached
    }

    // Get the field this block belongs to
    const fieldKey = fieldListItemMap.value[uuid]
    if (!fieldKey) {
      nestingLevelMap.set(uuid, 0)
      return 0
    }

    const field = mutatedFieldsMap[fieldKey]
    if (!field) {
      nestingLevelMap.set(uuid, 0)
      return 0
    }

    // Check if the parent entity is also a block
    const parentEntityUuid = field.entityUuid
    const parentFieldKey = fieldListItemMap.value[parentEntityUuid]

    if (!parentFieldKey) {
      // Parent is not a block, so this is level 0
      nestingLevelMap.set(uuid, 0)
      return 0
    }

    // Parent is a block, calculate its nesting level recursively
    const parentLevel = calculateNestingLevel(parentEntityUuid)
    const level = parentLevel + 1
    nestingLevelMap.set(uuid, level)
    return level
  }

  function getNestingLevel(uuid: string): number {
    return nestingLevelMap.get(uuid) ?? 0
  }

  function isChildOf(childUuid: string, parentUuid: string): boolean {
    // Get the field the child belongs to.
    const fieldKey = fieldListItemMap.value[childUuid]
    if (!fieldKey) {
      return false
    }

    const field = mutatedFieldsMap[fieldKey]
    if (!field) {
      return false
    }

    // Check if the parent entity is the parentUuid.
    if (field.entityUuid === parentUuid) {
      return true
    }

    // Recursively check if the parent entity is a child of parentUuid.
    return isChildOf(field.entityUuid, parentUuid)
  }

  addElementClasses(document.body, 'bk-body-loading', isLoading)

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
      if (errorMessage !== false) {
        emitMessage(
          errorMessage ||
            $t('unexpectedMutationError', 'An unexpected error happened.'),
          'error',
          e,
        )
      }
    }

    unlockBody()
    return false
  }

  async function loadState() {
    try {
      const state = await adapter.loadState()
      if (!state) {
        throw new Error('Missing state.')
      }
      setContext(adapter.mapState(state))
      stateLoadError.value = false
      stateLoaded.value = true
    } catch {
      stateLoadError.value = true
      stateLoaded.value = false
    }
  }

  const canEdit = computed(
    () =>
      stateLoaded.value &&
      !!owner.value?.currentUserIsOwner &&
      !stateLoadError.value &&
      permissions.includes('edit'),
  )
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

  const stateAvailable = computed(
    () => stateLoaded.value && !stateLoadError.value,
  )

  function getMappedState() {
    if (!_mappedState) {
      throw new Error('Called getMappedState() before a state is available.')
    }
    return _mappedState
  }

  function setOverrideState(state: MappedState) {
    setContext(state, true)
  }

  function clearOverrideState() {
    if (!_mappedState) {
      throw new Error('Missing previous state.')
    }

    setContext(_mappedState)
  }

  return {
    stateAvailable,
    getMappedState,
    refreshKey,
    owner: readonly(owner),
    publishOptions: readonly(publishOptions),
    mutatedFields,
    entity,
    mutatedOptions,
    mutatedItemProps,
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
    getAllUuids,
    getNestingLevel,
    isChildOf,
    setOverrideState,
    clearOverrideState,
    fromLibraryUuids: readonly(fromLibraryUuids),
    permissions: computed(() => permissions),
    getFieldKeyForUuid,
    getParentEntityUuid,
  }
}
