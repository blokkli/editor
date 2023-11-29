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
import editStateProvider from './../helpers/stateProvider'
import paragraphTypeProvider from './../helpers/paragraphTypeProvider'
import domProvider from './../helpers/domProvider'
import storageProvider from './../helpers/storageProvider'
import uiProvider from './../helpers/uiProvider'

import { eventBus } from './../eventBus'
import '#nuxt-paragraphs-builder/styles'
import { PbStore, PbAvailableFeatures } from '#pb/types'
import getAdapter from '#blokkli/compiled-edit-adapter'

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

const keyboard = keyboardProvider()
const selection = selectionProvider(keyboard.isPressingSpace)
const types = await paragraphTypeProvider(
  adapter,
  selection.blocks,
  props.entityType,
  props.bundle,
)

const dom = domProvider()
const storage = storageProvider()
const ui = uiProvider()

const animation = animationFrameProvider()

const isLoading = ref(false)
const isInitializing = ref(true)

useHead({
  bodyAttrs: {
    class: [isLoading.value ? 'pb-is-loading' : ''],
  },
})

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
  await loadAvailableFeatures()
  await loadState(currentLanguage.value)

  nextTick(() => {
    isInitializing.value = false
  })
})

onBeforeUnmount(() => {
  isInitializing.value = true
  toolbarLoaded.value = false
})

provide('isEditing', true)
provide('paragraphsBuilderEditMode', editMode)
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
  violations: readonly(violations),
  eventBus,
  runtimeConfig,
  entity: readonly(entity),
  translationState: readonly(translationState),
  currentLanguage,
  editMode: readonly(editMode),
  mutatedOptions: mutatedParagraphOptions,
  ownerName: readonly(ownerName),
  currentUserIsOwner: readonly(currentUserIsOwner),
  mutateWithLoadingState,
  refreshKey: readonly(refreshKey),
  dom,
  storage,
  types,
  selection,
  keyboard,
  ui,
  animation,
})
</script>
