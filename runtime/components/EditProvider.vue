<template>
  <Loading v-if="isInitializing" />

  <Selection
    v-if="selectedParagraphs.length && canEdit"
    :items="selectedParagraphs"
    :is-pressing-control="isPressingControl"
  />

  <ParagraphActions />

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
    <FeatureAvailableParagraphs v-if="canEdit && !isTranslation" />

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
  DraggableExistingParagraphItem,
  MutatedParagraphOptions,
} from './Edit/types'
import '#nuxt-paragraphs-builder/styles'
import {
  PbMutatedField,
  PbEditState,
  PbMutation,
  PbViolation,
  PbEditEntity,
  PbEditMode,
  PbStore,
  PbTranslationState,
  PbAvailableFeatures,
  PbMutateWithLoadingState,
} from '../types'
import getAdapter from './../adapter/drupal'
import { buildDraggableItem, falsy, findParagraphElement } from './Edit/helpers'

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig().public.paragraphsBuilder

const props = defineProps<{
  entityType: string
  entityUuid: string
  bundle: string
}>()

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

const contextVariables = computed(() => ({
  entityType: props.entityType.toUpperCase() as any,
  entityUuid: props.entityUuid || '',
  langcode: currentLanguage.value || '',
}))

const adapter = getAdapter(contextVariables.value)

const toolbarLoaded = ref(false)

const availableFeatures = ref<PbAvailableFeatures>({
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

const hasNoParagraphs = computed(
  () => !mutatedFields.value.find((v) => v.field.list?.length),
)

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
    allowedTypes.value
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
    } else {
      throw new Error('Unexpected error.')
    }
    if (successMessage) {
      emitMessage(successMessage)
    }
    checkDOMState()
    return true
  } catch (_e) {
    emitMessage(
      errorMessage || 'Es ist ein unerwarteter Fehler aufgetreten.',
      'error',
    )
  }

  checkDOMState()
  unlockBody()
  return false
}

function checkDOMState() {
  nextTick(() => {
    // Check if the currently selected paragraph is still in the DOM.
    if (selectedParagraph.value) {
      const el = findParagraphElement(selectedParagraph.value.uuid)
      if (!el) {
        selectedParagraph.value = null
      }
    }
  })
}

function onDraggingStart() {
  isDragging.value = true
}

function onDraggingEnd() {
  isDragging.value = false
}

function setContext(context?: PbEditState) {
  removeDroppedElements()
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

async function loadState(langcode?: string | undefined | null) {
  const state = await adapter.loadState(langcode || currentLanguage.value)
  if (state) {
    setContext(adapter.mapState(state))
  }
  unlockBody()
}

async function loadAvailableFeatures() {
  const data = await adapter.getAvailableFeatures()
  availableFeatures.value.comment = !!data?.comment
  availableFeatures.value.conversion = !!data?.conversion
  availableFeatures.value.duplicate = !!data?.duplicate
  availableFeatures.value.library = !!data?.library
  if (runtimeConfig.disableLibrary) {
    availableFeatures.value.library = false
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
      allowedTypes.value
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

const { data: allTypesData } = await useLazyAsyncData(() =>
  adapter.getAllParagraphTypes(),
)
const allTypes = computed(() => allTypesData.value || [])

const { data: allowedTypesData } = await useLazyAsyncData(() =>
  adapter.getAvailableParagraphTypes(),
)
const allowedTypes = computed(() => allowedTypesData.value || [])

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
  eventBus.on('select', onSelectParagraph)
  eventBus.on('selectAdditional', onSelectParagraphAdditional)
  eventBus.on('draggingStart', onDraggingStart)
  eventBus.on('draggingEnd', onDraggingEnd)
  eventBus.on('reloadState', onReloadState)
  eventBus.on('reloadEntity', onReloadEntity)
  eventBus.on('exitEditor', onExitEditor)
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
  eventBus.off('select', onSelectParagraph)
  eventBus.off('selectAdditional', onSelectParagraphAdditional)
  eventBus.off('draggingStart', onDraggingStart)
  eventBus.off('draggingEnd', onDraggingEnd)
  eventBus.off('reloadState', onReloadState)
  eventBus.off('reloadEntity', onReloadEntity)
  eventBus.off('exitEditor', onExitEditor)
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

const pbStore: PbStore = {
  adapter,
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
  mutateWithLoadingState,
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
