<template>
  <Loading v-if="isInitializing" />

  <Selection
    v-if="selectedParagraphs.length && canEdit"
    :items="selectedParagraphs"
    :is-pressing-control="isPressingControl"
    @delete="deleteSelectedParagraphs"
  />

  <ParagraphActions v-if="data" />

  <Messages />

  <Toolbar @loaded="toolbarLoaded = true" />

  <div v-if="!isInitializing && toolbarLoaded" :key="route.fullPath">
    <!-- Sidebar -->
    <FeatureHistory />
    <FeatureLibrary v-if="availableFeatures.library" />
    <FeatureComments v-if="availableFeatures.comment" />
    <FeatureClipboard />
    <FeatureStructure />
    <FeatureValidations />

    <!-- View Options -->
    <FeatureGrid v-if="runtimeConfig.gridMarkup" />
    <FeatureMask />
    <FeatureCanvas />
    <FeatureFieldAreas />

    <!-- General -->
    <FeaturePreview />
    <FeatureEntityTitle />
    <FeatureTranslations />
    <FeatureOwnership />
    <FeatureMultiSelect v-if="!isPressingSpace && canEdit && !isTranslation" />
    <FeatureDraggingOverlay />
    <FeatureAvailableParagraphs v-if="data && canEdit && !isTranslation" />

    <!-- Form -->
    <FeatureDrupalFrame />

    <!-- Menu -->
    <FeaturePublish />
    <FeatureRevert />
    <FeatureImportExisting />
    <FeatureExit />

    <!-- Paragraph Actions -->
    <FeatureEditParagraph />
    <FeatureDuplicateParagraph />
    <FeatureDeleteParagraph />
    <FeatureParagraphOptions />
    <FeatureConversions />
  </div>

  <slot></slot>
</template>

<script lang="ts" setup>
import Toolbar from './Edit/Toolbar/index.vue'
import ParagraphActions from './Edit/ParagraphActions.vue'
import Selection from './Edit/Features/MultiSelect/Selection/index.vue'
import Messages from './Edit/Messages/index.vue'
import Loading from './Edit/Loading/index.vue'

import FeatureLibrary from './Edit/Features/Library/index.vue'
import FeatureClipboard from './Edit/Features/Clipboard/index.vue'
import FeatureStructure from './Edit/Features/Structure/index.vue'
import FeatureHistory from './Edit/Features/History/index.vue'
import FeatureValidations from './Edit/Features/Validations/index.vue'
import FeatureComments from './Edit/Features/Comments/index.vue'
import FeatureGrid from './Edit/Features/Grid/index.vue'
import FeatureMask from './Edit/Features/Mask/index.vue'
import FeatureCanvas from './Edit/Features/Canvas/index.vue'
import FeaturePreview from './Edit/Features/Preview/index.vue'
import FeatureEntityTitle from './Edit/Features/EntityTitle/index.vue'
import FeatureDrupalFrame from './Edit/Features/DrupalFrame/index.vue'
import FeatureTranslations from './Edit/Features/Translations/index.vue'
import FeatureRevert from './Edit/Features/Revert/index.vue'
import FeatureImportExisting from './Edit/Features/ImportExisting/index.vue'
import FeatureExit from './Edit/Features/Exit/index.vue'
import FeaturePublish from './Edit/Features/Publish/index.vue'
import FeatureFieldAreas from './Edit/Features/FieldAreas/index.vue'
import FeatureParagraphOptions from './Edit/Features/ParagraphOptions/index.vue'
import FeatureDuplicateParagraph from './Edit/Features/DuplicateParagraph/index.vue'
import FeatureEditParagraph from './Edit/Features/EditParagraph/index.vue'
import FeatureDeleteParagraph from './Edit/Features/DeleteParagraph/index.vue'
import FeatureOwnership from './Edit/Features/Ownership/index.vue'
import FeatureMultiSelect from './Edit/Features/MultiSelect/index.vue'
import FeatureDraggingOverlay from './Edit/Features/DraggingOverlay/index.vue'
import FeatureAvailableParagraphs from './Edit/Features/AvailableParagraphs/index.vue'
import FeatureConversions from './Edit/Features/Conversions/index.vue'

import { eventBus, emitMessage } from './Edit/eventBus'
import {
  MoveParagraphEvent,
  AddNewParagraphEvent,
  AddClipboardParagraphEvent,
  DraggableExistingParagraphItem,
  MoveMultipleParagraphsEvent,
  AddReusableParagraphEvent,
  MutatedParagraphOptions,
  MakeReusableEvent,
} from './Edit/types'
import { definitions } from '#nuxt-paragraphs-builder/definitions'
import '#nuxt-paragraphs-builder/styles'
import {
  PbMutatedField,
  PbAllowedBundle,
  PbEditState,
  PbMutation,
  PbViolation,
  PbType,
  PbEditEntity,
  PbEditMode,
  PbStore,
  PbTranslationState,
  PbConversion,
} from '../types'
import adapter from './../adapter/drupal'
import { buildDraggableItem, falsy, findParagraphElement } from './Edit/helpers'
import { ParagraphsBuilderEditStateFragment } from '#build/graphql-operations'

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig().public.paragraphsBuilder

const toolbarLoaded = ref(false)

const availableFeatures = ref({
  comment: false,
  conversion: false,
  duplicate: false,
  library: false,
})
const currentUserIsOwner = ref(false)
const ownerName = ref('')
const mutatedFields = ref<PbMutatedField[]>([])
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

const selectedParagraph = ref<DraggableExistingParagraphItem | null>(null)
const selectedParagraphs = ref<DraggableExistingParagraphItem[]>([])
const activeFieldKey = ref('')
const violations = ref<PbViolation[]>([])
const isDragging = ref(false)
const refreshTrigger = ref(0)
const currentMutationIndex = ref(-1)
const mutations = ref<PbMutation[]>([])
const visibleSidebar = ref('')
const isLoading = ref(false)
const isInitializing = ref(true)
const isPressingControl = ref(false)
const isPressingSpace = ref(false)
const showTemplates = ref(false)
const previewGrantUrl = ref('')

const currentLanguage = computed({
  get() {
    const v = route.query.language
    if (v && typeof v === 'string') {
      return v
    }
    return translationState.value.sourceLanguage
  },
  set(language) {
    const path = entity.value.translations.find((v) => v.langcode === language)
      ?.url
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
const hasSidebar = computed(() => !!visibleSidebar.value)
const selectedParagraphType = computed<PbType | undefined>(
  () =>
    data.value?.allTypes.find(
      (v) => v.id === selectedParagraph.value?.paragraphType,
    ),
)
const contextVariables = computed(() => ({
  entityType: props.entityType.toUpperCase() as any,
  entityUuid: props.entityUuid,
  langcode: currentLanguage.value,
}))

const hasNoParagraphs = computed(
  () => !mutatedFields.value.find((v) => v.field.list?.length),
)

const allowedTypes = computed<PbAllowedBundle[]>(() => {
  return data.value?.allowedTypes || []
})

/**
 * The allowed paragraph types in the current field item list.
 *
 * Unlike selectableParagraphTypes, this always uses the selected paragraphs's
 * parent field to determine the allowed types.
 */
const allowedTypesInList = computed(() => {
  if (selectedParagraph.value) {
    return allowedTypes.value
      .filter(
        (v) =>
          v.entityType === props.entityType &&
          v.bundle === props.bundle &&
          v.fieldName === selectedParagraph.value?.hostFieldName,
      )
      .flatMap((v) => v.allowedTypes)
      .filter(Boolean) as string[]
  }
  return []
})

/**
 * All paragraph types that themselves have nested paragraphs.
 */
const paragraphTypesWithNested = computed<string[]>(() => {
  return (
    data.value?.allowedTypes
      .filter((v) => v.entityType === 'paragraph')
      .map((v) => v.bundle) || []
  )
})

function modulo(n: number, m: number) {
  return ((n % m) + m) % m
}

function onSelectEnd(uuids: string[]) {
  const paragraphs = uuids
    .map((uuid) => {
      const element = findParagraphElement(uuid)
      if (element) {
        const item = buildDraggableItem(element)
        if (item && item.itemType === 'existing') {
          return item
        }
      }
    })
    .filter(falsy)
  if (paragraphs.length === 1) {
    selectedParagraph.value = paragraphs[0]
  } else {
    selectedParagraphs.value = paragraphs
  }
}

watch(hasSidebar, (has) =>
  has
    ? document.body.classList.add('pb-has-sidebar')
    : document.body.classList.remove('pb-has-sidebar'),
)

watch(isPressingSpace, (has) =>
  has
    ? document.body.classList.add('pb-is-pressing-space')
    : document.body.classList.remove('pb-is-pressing-space'),
)

useHead({
  bodyAttrs: {
    class: [isLoading.value ? 'pb-is-loading' : ''],
  },
})

const props = defineProps<{
  entityType: string
  entityUuid: string
  bundle: string
}>()

function onMultiSelectStart() {
  selectedParagraph.value = null
  selectedParagraphs.value = []
}

function toggleSidebar(key: string) {
  removeDroppedElements()
  if (visibleSidebar.value === key) {
    visibleSidebar.value = ''
  } else {
    visibleSidebar.value = key
  }
}

interface MutationResponseLike<T> {
  data: {
    state?: {
      action?: {
        success?: boolean
        state?: T
      }
    }
  }
}

function lockBody() {
  document.body.classList.add('pb-body-loading')
  isLoading.value = true
}

function unlockBody() {
  document.body.classList.remove('pb-body-loading')
  isLoading.value = false
}

async function mutateWithLoadingState(
  promise: Promise<MutationResponseLike<ParagraphsBuilderEditStateFragment>>,
  errorMessage?: string,
  successMessage?: string,
): Promise<boolean> {
  lockBody()
  try {
    const result = await promise
    unlockBody()
    if (result.data.state?.action?.state) {
      setContext(adapter.mapState(result.data.state?.action?.state))
    } else {
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

async function addNewParagraph(e: AddNewParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  const definition = definitions.find((v) => v.bundle === e.item.paragraphType)
  if (definition?.disableEdit) {
    await mutateWithLoadingState(
      useGraphqlMutation('addParagraph', {
        ...contextVariables.value,
        hostType: e.host.type,
        hostFieldName: e.host.fieldName,
        hostUuid: e.host.uuid,
        afterUuid: e.afterUuid,
        type: e.type,
      }),
    )
  }
}

function onDraggingStart() {
  isDragging.value = true
}

function onDraggingEnd() {
  isDragging.value = false
}

async function onPersistOptions(items: UpdateParagraphOptionEvent[]) {
  if (!items.length) {
    return
  }
  if (items.length === 1) {
    const item = items[0]
    await mutateWithLoadingState(
      useGraphqlMutation('updateParagraphOption', {
        ...contextVariables.value,
        ...item,
      }),
    )
    return
  }
  const persistItems = items.map((v) => {
    return {
      uuid: v.uuid,
      key: v.key,
      value: v.value,
      pluginId: 'paragraph_builder_data',
    }
  })
  await mutateWithLoadingState(
    useGraphqlMutation('bulkUpdateParagraphBehaviorSettings', {
      ...contextVariables.value,
      items: persistItems,
    }),
  )
}

async function addClipboardParagraph(e: AddClipboardParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  if (e.item.paragraphType === 'text') {
    await mutateWithLoadingState(
      useGraphqlMutation('addTextParagraph', {
        ...contextVariables.value,
        text: e.item.clipboardData,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      }),
      'Der Text-Abschnitt konnte nicht hinzugefügt werden.',
    )
  } else if (e.item.paragraphType === 'video_remote') {
    await mutateWithLoadingState(
      useGraphqlMutation('addVideoRemoteParagraph', {
        ...contextVariables.value,
        url: 'http://www.youtube.com/watch?v=' + e.item.clipboardData,
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      }),
      'Der Video-Abschnitt konnte nicht hinzugefügt werden.',
    )
  } else if (e.item.paragraphType === 'image') {
    await mutateWithLoadingState(
      useGraphqlMutation('addImageParagraph', {
        ...contextVariables.value,
        data: e.item.clipboardData,
        fileName: e.item.additional || '',
        hostType: e.host.type,
        hostUuid: e.host.uuid,
        hostFieldName: e.host.fieldName,
        afterUuid: e.afterUuid,
      }),
      'Das Bild konnte nicht hinzugefügt werden.',
    )
  }
  if (visibleSidebar.value === 'clipboard') {
    visibleSidebar.value = ''
  }
}

async function moveParagraph(e: MoveParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('moveParagraph', {
      ...contextVariables.value,
      uuid: e.item.uuid,
      hostType: e.host.type,
      hostUuid: e.host.uuid,
      hostFieldName: e.host.fieldName,
      afterUuid: e.afterUuid,
    }),
    'Der Abschnitt konnte nicht verschoben werden.',
  )
}

async function moveMultipleParagraphs(e: MoveMultipleParagraphsEvent) {
  if (!canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('moveMultipleParagraphs', {
      ...contextVariables.value,
      uuids: e.uuids,
      hostType: e.host.type,
      hostUuid: e.host.uuid,
      hostFieldName: e.host.fieldName,
      afterUuid: e.afterUuid,
    }),
    'Die Abschnitte konnte nicht verschoben werden.',
  )
}

async function addReusableParagraph(e: AddReusableParagraphEvent) {
  if (!canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('addReusableParagraph', {
      ...contextVariables.value,
      libraryItemId: e.item.libraryItemId,
      hostType: e.host.type,
      hostUuid: e.host.uuid,
      hostFieldName: e.host.fieldName,
      afterUuid: e.afterUuid,
    }),
    'Der wiederverwendbare Abschnitt konnte nicht hinzugefügt werden.',
  )
}

function setContext(context?: PbEditState) {
  removeDroppedElements()
  modalClose()
  const newMutatedFields = context?.mutatedState?.fields || []
  mutatedFields.value = newMutatedFields
  mutatedParagraphOptions.value = context?.mutatedState?.behaviorSettings || {}
  refreshTrigger.value = Date.now()
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

  eventBus.emit('updateMutatedFields', { fields: newMutatedFields })
}

async function loadState(langcode: string) {
  const { data } = await useGraphqlQuery('paragraphsEditState', {
    ...contextVariables.value,
    langcode,
  })

  setContext(adapter.mapState(data.state))
  unlockBody()
}

async function loadAvailableFeatures() {
  const data = await useGraphqlQuery('paragraphsBuilderAvailableFeatures').then(
    (v) => v.data.features,
  )
  const mutations = data?.mutations || []
  availableFeatures.value.comment = !!data?.comment
  availableFeatures.value.conversion = !!data?.conversion
  availableFeatures.value.duplicate = mutations.includes('duplicate')
  availableFeatures.value.library = !!data?.library
  if (runtimeConfig.disableLibrary) {
    availableFeatures.value.library = false
  }
}

function modalClose() {
  removeDroppedElements()
  unlockBody()
}

async function onReloadState() {
  removeDroppedElements()
  await loadState(currentLanguage.value)
}

async function onReloadEntity() {
  await refreshNuxtData()
  await loadState(currentLanguage.value)
}

async function unselectParagraph() {
  selectedParagraph.value = null
}

function onSelectParagraph(item: DraggableExistingParagraphItem) {
  selectedParagraph.value = item
  selectedParagraphs.value = []

  // Determine if the selected paragraph has nested paragraphs.
  const hasNested = paragraphTypesWithNested.value.includes(item.paragraphType)
  if (hasNested) {
    // Get the nested paragraph fields.
    const nestedFields =
      data.value?.allowedTypes
        .filter(
          (v) =>
            v.entityType === 'paragraph' && v.bundle === item.paragraphType,
        )
        .map((v) => v.fieldName) || []

    // When we have exactly one nested paragraph field, we can set the active
    // field key to this field. That way the UI will show this field is active
    // and display available paragraphs for this field.
    if (nestedFields.length === 1) {
      activeFieldKey.value = `${item.uuid}:${nestedFields[0]}`
      return
    }
  }
  activeFieldKey.value = `${item.hostUuid}:${item.hostFieldName}`
}

function onSelectParagraphAdditional(item: DraggableExistingParagraphItem) {
  if (selectedParagraphs.value.find((v) => v.uuid === item.uuid)) {
    selectedParagraphs.value = selectedParagraphs.value.filter(
      (v) => v.uuid !== item.uuid,
    )
    if (selectedParagraphs.value.length === 1) {
      selectedParagraph.value = selectedParagraphs.value[0]
      selectedParagraphs.value = []
    }
    return
  }
  if (selectedParagraph.value) {
    selectedParagraphs.value.push(selectedParagraph.value)
  }
  selectedParagraphs.value.push(item)
  unselectParagraph()
}

async function deleteParagraph(uuid: string | null | undefined) {
  if (!uuid || !canEdit.value || isTranslation.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('deleteParagraph', {
      ...contextVariables.value,
      uuid,
    }),
    'Der Abschnitt konnte nicht entfernt werden.',
  )

  unselectParagraph()
}

async function deleteSelectedParagraphs() {
  const uuids = selectedParagraphs.value.map((v) => v.uuid)
  if (!uuids.length || !canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('deleteMultipleParagraphs', {
      ...contextVariables.value,
      uuids,
    }),
    'Die Abschnitte konnten nicht entfernt werden.',
  )

  unselectParagraph()
  selectedParagraphs.value = []
}

async function convertParagraph(uuid: string, targetBundle: string) {
  if (!canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('convertParagraph', {
      ...contextVariables.value,
      uuid,
      targetBundle,
    }),
    'Der Abschnitt konnte nicht konvertiert werden.',
  )

  unselectParagraph()
}

async function duplicateParagraph(uuid: string | null | undefined) {
  if (!uuid || !canEdit.value || isTranslation.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('duplicateParagraph', {
      ...contextVariables.value,
      uuid,
    }),
    'Der Abschnitt konnte nicht dupliziert werden.',
  )
}

async function makeParagraphReusable(e: MakeReusableEvent) {
  if (!e.uuid || !canEdit.value) {
    return
  }
  await mutateWithLoadingState(
    useGraphqlMutation('makeParagraphReusable', {
      ...contextVariables.value,
      ...e,
    }),
    'Der Abschnitt konnte nicht wiederverwendbar gemacht werden.',
  )
  selectedParagraph.value = null
}

function removeDroppedElements() {
  document
    .querySelectorAll('.pb-paragraphs-container .pb-clone')
    .forEach((v) => v.remove())
  document
    .querySelectorAll('.pb-paragraphs-container .pb-moved-item')
    .forEach((v) => v.remove())
  document
    .querySelectorAll('.pb-multi-select-hidden')
    .forEach((v) => v.classList.remove('pb-multi-select-hidden'))
}

const { data } = await useLazyAsyncData(() => {
  return useGraphqlQuery('availableParagraphs').then((v) => {
    const allTypes = v.data.entityQuery.items?.filter(
      (v) => v && 'icon' in v,
    ) as PbType[]
    const allowedTypes = v.data.paragraphsBuilderAllowedTypes || []
    const conversions = v.data.paragraphsBuilderConversions || []
    return { allTypes, allowedTypes, conversions }
  })
})

const conversions = computed<PbConversion[]>(
  () => data.value?.conversions || [],
)

async function revertAllChanges() {
  await mutateWithLoadingState(
    useGraphqlMutation('revertAllChanges', contextVariables.value),
    'Änderungen konnten nicht verworfen werden.',
    'Alle Änderungen wurden verworfen.',
  )
}

function onWindowMouseDown(e: MouseEvent) {
  if (e.ctrlKey || isPressingSpace.value) {
    return
  }
  if (e.target && e.target instanceof Element) {
    if (e.target.closest('.pb-paragraph-actions')) {
      return
    }
    if (e.target.closest('[data-uuid]')) {
      return
    }
    if (e.target.closest('.pb-list')) {
      return
    }
    if (e.target.closest('.pb-control')) {
      return
    }

    const closestField = e.target.closest('[data-field-key]')
    if (closestField && closestField instanceof HTMLElement) {
      activeFieldKey.value = closestField.dataset.fieldKey || ''
    } else {
      activeFieldKey.value = ''
    }
  }
  unselectParagraph()
}

function onExitEditor() {
  window.location.href = route.path
}

async function copyFromExisting(sourceUuid: string, fields: string[]) {
  await mutateWithLoadingState(
    useGraphqlMutation('paragraphsBuilderCopyFromExisting', {
      ...contextVariables.value,
      sourceUuid,
      fields,
    }),
    'Inhalte konnten nicht übernommen werden.',
    'Inhalte erfolgreich übernommen.',
  )
  showTemplates.value = false
}

async function onPublish() {
  await mutateWithLoadingState(
    useGraphqlMutation('paragraphsBuilderPublish', contextVariables.value),
    'Änderungen konnten nicht publiziert werden.',
    'Änderungen erfolgreich publiziert.',
  )
}

async function undo() {
  await mutateWithLoadingState(
    useGraphqlMutation('paragraphsBuilderUndo', contextVariables.value),
  )
}

async function redo() {
  await mutateWithLoadingState(
    useGraphqlMutation('paragraphsBuilderRedo', contextVariables.value),
  )
}

async function setMutationIndex(index: number) {
  await mutateWithLoadingState(
    useGraphqlMutation('paragraphsBuilderSetHistoryIndex', {
      ...contextVariables.value,
      index,
    }),
  )
}

async function takeOwnership() {
  await mutateWithLoadingState(
    useGraphqlMutation(
      'paragraphsBuilderTakeOwnership',
      contextVariables.value,
    ),
    'Fehler beim Zuweisen.',
    'Sie sind nun der Besitzer.',
  )
}

/**
 * Allows using Tab / Shift-Tab to navigate through paragraphs.
 */
function onTabPress(isBackwards: boolean) {
  const paragraphs = [
    ...document.querySelectorAll('[data-uuid]'),
  ] as HTMLElement[]
  if (!paragraphs.length) {
    return
  }

  const currentIndex = selectedParagraph.value
    ? paragraphs.findIndex(
        (v) => v.dataset.uuid === selectedParagraph.value?.uuid,
      )
    : -1

  const targetIndex = modulo(
    isBackwards ? currentIndex - 1 : currentIndex + 1,
    paragraphs.length,
  )
  const targetElement = paragraphs[targetIndex]
  if (!targetElement) {
    return
  }
  const targetItem = buildDraggableItem(targetElement)
  if (!targetItem) {
    return
  }

  if (targetItem.itemType !== 'existing') {
    return
  }

  targetElement.scrollIntoView({
    block: 'nearest',
  })

  eventBus.emit('select', targetItem)
}

function setClipboard(text: string) {
  const type = 'text/plain'
  const blob = new Blob([text], { type })
  const data = [new ClipboardItem({ [type]: blob })]

  try {
    navigator.clipboard.write(data)
  } catch (_e) {}
}

function copySelectedParagraphToClipboard(uuid: string) {
  const element = document.querySelector(`[data-uuid="${uuid}"]`)
  if (element instanceof HTMLElement) {
    const markup = element.outerHTML
    setClipboard(markup)
  }
}

function onKeyDown(e: KeyboardEvent) {
  // For the one person that remapped caps lock to control.
  if (e.key === 'Control' || e.key === 'CapsLock') {
    isPressingControl.value = true
  } else if (e.code === 'Space') {
    isPressingSpace.value = true
  } else if (e.key === 'Tab') {
    if (selectedParagraph.value) {
      e.preventDefault()
      onTabPress(e.shiftKey)
    }
  } else if (e.key === 'c') {
    if (selectedParagraph.value) {
      copySelectedParagraphToClipboard(selectedParagraph.value.uuid)
    }
  }

  eventBus.emit('keyPressed', {
    code: e.key,
    shift: e.shiftKey,
    meta: e.ctrlKey,
  })
}

function onKeyUp() {
  isPressingControl.value = false
  isPressingSpace.value = false
}

useHead({
  bodyAttrs: {
    class: ['pb-body'],
  },
  htmlAttrs: {
    class: ['pb-html-root'],
  },
})

const activeViewOptions = ref<string[]>([])
const toggleViewOption = (id: string) => {
  if (activeViewOptions.value.includes(id)) {
    activeViewOptions.value = activeViewOptions.value.filter((v) => v !== id)
  } else {
    activeViewOptions.value.push(id)
  }

  localStorage.setItem(
    '_pb_active_view_options',
    JSON.stringify(activeViewOptions.value),
  )
}

function restoreActiveViewOptions() {
  try {
    const data = localStorage.getItem('_pb_active_view_options')
    if (data) {
      const items = JSON.parse(data)
      if (items && Array.isArray(items)) {
        activeViewOptions.value = items
      }
    }
  } catch (_e) {}
}

onMounted(async () => {
  restoreActiveViewOptions()
  // document.documentElement.classList.add('pb-html-root')
  // document.body.classList.add('pb-body')
  await loadAvailableFeatures()
  await loadState(currentLanguage.value)
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  document.body.addEventListener('mousedown', onWindowMouseDown)
  eventBus.on('addNewParagraph', addNewParagraph)
  eventBus.on('addReusableParagraph', addReusableParagraph)
  eventBus.on('select', onSelectParagraph)
  eventBus.on('selectAdditional', onSelectParagraphAdditional)
  eventBus.on('addClipboardParagraph', addClipboardParagraph)
  eventBus.on('moveParagraph', moveParagraph)
  eventBus.on('moveMultipleParagraphs', moveMultipleParagraphs)
  eventBus.on('draggingStart', onDraggingStart)
  eventBus.on('draggingEnd', onDraggingEnd)
  eventBus.on('makeReusable', makeParagraphReusable)
  eventBus.on('undo', undo)
  eventBus.on('redo', redo)
  eventBus.on('reloadState', onReloadState)
  eventBus.on('reloadEntity', onReloadEntity)
  eventBus.on('exitEditor', onExitEditor)
  eventBus.on('revertAllChanges', revertAllChanges)
  eventBus.on('publish', onPublish)
  eventBus.on('updateParagraphOptions', onPersistOptions)
  eventBus.on('duplicateParagraph', duplicateParagraph)
  eventBus.on('deleteParagraph', deleteParagraph)
  eventBus.on('select:start', onMultiSelectStart)
  eventBus.on('select:end', onSelectEnd)

  // Show the import dialog when there are no paragraphs yet and no mutations.
  if (hasNoParagraphs.value && !mutations.value.length) {
    showTemplates.value = true
  }

  isInitializing.value = false
})

onBeforeUnmount(() => {
  toolbarLoaded.value = false
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)
  document.body.removeEventListener('mousedown', onWindowMouseDown)
  eventBus.off('addNewParagraph', addNewParagraph)
  eventBus.off('addReusableParagraph', addReusableParagraph)
  eventBus.off('select', onSelectParagraph)
  eventBus.off('selectAdditional', onSelectParagraphAdditional)
  eventBus.off('addClipboardParagraph', addClipboardParagraph)
  eventBus.off('moveParagraph', moveParagraph)
  eventBus.off('moveMultipleParagraphs', moveMultipleParagraphs)
  eventBus.off('draggingStart', onDraggingStart)
  eventBus.off('draggingEnd', onDraggingEnd)
  eventBus.off('makeReusable', makeParagraphReusable)
  eventBus.off('undo', undo)
  eventBus.off('redo', redo)
  eventBus.off('reloadState', onReloadState)
  eventBus.off('reloadEntity', onReloadEntity)
  eventBus.off('exitEditor', onExitEditor)
  eventBus.off('revertAllChanges', revertAllChanges)
  eventBus.off('publish', onPublish)
  eventBus.off('updateParagraphOptions', onPersistOptions)
  eventBus.off('duplicateParagraph', duplicateParagraph)
  eventBus.off('deleteParagraph', deleteParagraph)
  eventBus.off('select:start', onMultiSelectStart)
  eventBus.off('select:end', onSelectEnd)

  // document.documentElement.classList.remove('pb-html-root')
  // document.body.classList.remove('pb-body')
})

provide('paragraphsBuilderMutatedFields', mutatedFields)
provide('isEditing', true)
provide('paragraphsBuilderEditMode', editMode)
provide('paragraphsBuilderAllowedTypes', allowedTypes)
provide('paragraphsBuilderEditContext', { eventBus, mutatedParagraphOptions })
const allTypes = computed(() => data.value?.allTypes || [])

const pbStore: PbStore = {
  entityType: props.entityType,
  entityUuid: props.entityUuid,
  entityBundle: props.bundle,
  showTemplates,
  canEdit,
  mutatedFields: readonly(mutatedFields),
  availableFeatures: readonly(availableFeatures),
  currentMutationIndex: readonly(currentMutationIndex),
  mutations: readonly(mutations),
  activeSidebar: readonly(visibleSidebar),
  toggleSidebar,
  showSidebar: (id: string) => (visibleSidebar.value = id),
  allTypes,
  violations: readonly(violations),
  setMutationIndex,
  eventBus,
  selectedParagraph: readonly(selectedParagraph),
  allowedTypesInList,
  allowedTypes,
  paragraphTypesWithNested,
  activeViewOptions,
  toggleViewOption,
  runtimeConfig,
  activeFieldKey: readonly(activeFieldKey),
  setActiveFieldKey: (key: string) => (activeFieldKey.value = key),
  isPressingControl: readonly(isPressingControl),
  isPressingSpace: readonly(isPressingSpace),
  previewGrantUrl: readonly(previewGrantUrl),
  entity: readonly(entity),
  translationState: readonly(translationState),
  currentLanguage,
  editMode: readonly(editMode),
  mutatedOptions: mutatedParagraphOptions,
  ownerName: readonly(ownerName),
  currentUserIsOwner: readonly(currentUserIsOwner),
  takeOwnership,
  conversions,
}

provide('paragraphsBuilderStore', pbStore)
</script>

<style lang="postcss">
.pb-paragraphs-container {
  &.is-empty {
    min-height: 4rem;
  }
  .draggable {
    outline-offset: -3px;
    &:hover {
      outline: 2px solid rgba(0, 0, 0, 0.3);
    }
    a,
    button {
      pointer-events: none;
    }
  }
}

[data-element-type='existing'] {
  > * {
    user-select: none;
  }
  a,
  button {
    pointer-events: none;
  }
}

.pb-item-focused {
  outline: 4px solid var(--gin-color-primary);
  outline-offset: 0px;
  border-radius: 5px;
}

.sortable-fallback {
  pointer-events: none;
  display: none !important;
}
</style>
