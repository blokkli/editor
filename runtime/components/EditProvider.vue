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
import animationFrameProvider from './../helpers/animationFrame'
import keyboardProvider from './../helpers/keyboardProvider'
import selectionProvider from './../helpers/selectionProvider'
import settingsProvider from './../helpers/settingsProvider'
import editStateProvider from './../helpers/stateProvider'
import paragraphTypeProvider from './../helpers/paragraphTypeProvider'

import { eventBus } from './../eventBus'
import '#nuxt-paragraphs-builder/styles'
import { PbStore, PbAvailableFeatures } from '#pb/types'
import getAdapter from './../adapter/drupal'
import { removeDroppedElements } from '#pb/helpers'

const props = defineProps<{
  entityType: string
  entityUuid: string
  bundle: string
}>()

const adapter = getAdapter({
  entityType: props.entityType.toUpperCase() as any,
  entityUuid: props.entityUuid || '',
})

const route = useRoute()
const runtimeConfig = useRuntimeConfig().public.paragraphsBuilder

const {
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
  mutateWithLoadingState,
  loadState,
  editMode,
  currentLanguage,
  canEdit,
} = editStateProvider(adapter)

const toolbarLoaded = ref(false)

const availableFeatures = ref<PbAvailableFeatures>({
  comment: false,
  conversion: false,
  duplicate: false,
  library: false,
})

const { isPressingControl, isPressingSpace } = keyboardProvider()
const { selectedParagraphs, activeFieldKey, isDragging } =
  selectionProvider(isPressingSpace)
const { settings } = settingsProvider()
const { paragraphTypesWithNested, allowedTypesInList, allTypes, allowedTypes } =
  await paragraphTypeProvider(
    adapter,
    selectedParagraphs,
    props.entityType,
    props.bundle,
  )

animationFrameProvider()

const visibleSidebar = ref('')
const isLoading = ref(false)
const isInitializing = ref(true)

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

onMounted(async () => {
  document.documentElement.classList.add('pb-html-root')
  document.body.classList.add('pb-body')
  await loadAvailableFeatures()
  await loadState(currentLanguage.value)

  nextTick(() => {
    isInitializing.value = false
  })
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('pb-html-root')
  document.body.classList.remove('pb-body')
  isInitializing.value = true
  toolbarLoaded.value = false
})

provide(
  'paragraphsBuilderMutatedFields',
  computed(() => mutatedFields.value),
)
provide('isEditing', true)
provide('paragraphsBuilderEditMode', editMode)
provide('paragraphsBuilderAllowedTypes', allowedTypes)
provide('paragraphsBuilderEditContext', { eventBus, mutatedParagraphOptions })
provide<PbStore>('paragraphsBuilderStore', {
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
})
</script>
