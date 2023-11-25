<template>
  <Loading v-if="isInitializing" />
  <ParagraphActions />
  <Messages />
  <Toolbar @loaded="toolbarLoaded = true" />
  <Features v-if="!isInitializing && toolbarLoaded" :key="route.fullPath" />
  <slot v-if="!isInitializing"></slot>
</template>

<script lang="ts" setup>
import Toolbar from './Edit/Toolbar/index.vue'
import ParagraphActions from './Edit/ParagraphActions.vue'
import Messages from './Edit/Messages/index.vue'
import Loading from './Edit/Loading/index.vue'
import Features from './Edit/Features/index.vue'
import animationFrame from './../helpers/animationFrame'
import keyboardProvider from './../helpers/keyboardProvider'
import selectionProvider from './../helpers/selectionProvider'
import settingsProvider from './../helpers/settingsProvider'

import { eventBus, emitMessage } from './../eventBus'
import type { MutatedParagraphOptions } from '#pb/types'
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
} from '#pb/types'
import getAdapter from './../adapter/drupal'
import {
  falsy,
  findParagraphElement,
  onlyUnique,
  removeDroppedElements,
} from '#pb/helpers'

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

const adapter = getAdapter({
  entityType: props.entityType.toUpperCase() as any,
  entityUuid: props.entityUuid || '',
})

const toolbarLoaded = ref(false)

const availableFeatures = ref<PbAvailableFeatures>({
  comment: false,
  conversion: false,
  duplicate: false,
  library: false,
})
const refreshKey = ref('')
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

const { isPressingControl, isPressingSpace } = keyboardProvider()
const { selectedParagraphs, selectedParagraphUuids, activeFieldKey } =
  selectionProvider(isPressingSpace)
const { settings } = settingsProvider()

const violations = ref<PbViolation[]>([])
const isDragging = ref(false)
const currentMutationIndex = ref(-1)
const mutations = ref<PbMutation[]>([])
const visibleSidebar = ref('')
const isLoading = ref(false)
const isInitializing = ref(true)

const previewGrantUrl = ref('')

const canEdit = computed(() => currentUserIsOwner.value)
const isTranslation = computed(
  () => currentLanguage.value !== translationState.value.sourceLanguage,
)

watch(selectedParagraphs, () => {
  if (selectedParagraphs.value.length !== 1) {
    return
  }
  const item = selectedParagraphs.value[0]
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
    }
  }
  activeFieldKey.value = `${item.hostUuid}:${item.hostFieldName}`
})

const editMode = computed<PbEditMode>(() => {
  if (!canEdit.value) {
    return 'readonly'
  }
  if (isTranslation.value) {
    return 'translating'
  }

  return 'editing'
})

/**
 * The allowed paragraph types in the current field item list.
 *
 * Unlike selectableParagraphTypes, this always uses the selected paragraphs's
 * parent field to determine the allowed types.
 */
const allowedTypesInList = computed(() => {
  const hostFieldNames = selectedParagraphs.value
    .map((v) => v.hostFieldName)
    .filter(onlyUnique)
  if (hostFieldNames.length === 1) {
    return allowedTypes.value
      .filter(
        (v) =>
          v.entityType === props.entityType &&
          v.bundle === props.bundle &&
          v.fieldName === hostFieldNames[0],
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

useHead({
  bodyAttrs: {
    class: [isLoading.value ? 'pb-is-loading' : ''],
  },
})

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
    } else if (!result.data.state?.action?.success) {
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
    selectedParagraphUuids.value = selectedParagraphUuids.value.filter(
      (uuid) => {
        // Check if the currently selected paragraph is still in the DOM.
        const el = findParagraphElement(uuid)
        if (el) {
          return true
        }

        return false
      },
    )
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

  mutatedParagraphOptions.value = context?.mutatedState?.behaviorSettings || {}
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

const { data: allTypesData } = await useLazyAsyncData(() =>
  adapter.getAllParagraphTypes(),
)
const allTypes = computed(() => allTypesData.value || [])

const { data: allowedTypesData } = await useLazyAsyncData(() =>
  adapter.getAvailableParagraphTypes(),
)
const allowedTypes = computed(() => allowedTypesData.value || [])

function onExitEditor() {
  isInitializing.value = true
  nextTick(() => {
    window.location.href = route.path
  })
}

useHead({
  bodyAttrs: {
    class: ['pb-body'],
  },
  htmlAttrs: {
    class: ['pb-html-root'],
  },
})

animationFrame()

onMounted(async () => {
  await loadAvailableFeatures()
  await loadState(currentLanguage.value)

  eventBus.on('draggingStart', onDraggingStart)
  eventBus.on('draggingEnd', onDraggingEnd)
  eventBus.on('reloadState', onReloadState)
  eventBus.on('reloadEntity', onReloadEntity)
  eventBus.on('exitEditor', onExitEditor)

  nextTick(() => {
    isInitializing.value = false
  })
})

onBeforeUnmount(() => {
  toolbarLoaded.value = false
})

onUnmounted(() => {
  eventBus.off('draggingStart', onDraggingStart)
  eventBus.off('draggingEnd', onDraggingEnd)
  eventBus.off('reloadState', onReloadState)
  eventBus.off('reloadEntity', onReloadEntity)
  eventBus.off('exitEditor', onExitEditor)
})

provide(
  'paragraphsBuilderMutatedFields',
  computed(() => mutatedFields.value),
)
provide('isEditing', true)
provide('paragraphsBuilderEditMode', editMode)
provide('paragraphsBuilderAllowedTypes', allowedTypes)
provide('paragraphsBuilderEditContext', { eventBus, mutatedParagraphOptions })

const pbStore: PbStore = {
  adapter,
  entityType: props.entityType,
  entityUuid: props.entityUuid,
  entityBundle: props.bundle,
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
  selectedParagraphs,
  allowedTypesInList,
  allowedTypes,
  paragraphTypesWithNested,
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
  isDragging: readonly(isDragging),
  settings,
  refreshKey: readonly(refreshKey),
}

provide('paragraphsBuilderStore', pbStore)
</script>
