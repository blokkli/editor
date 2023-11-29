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
import { PbStore } from '#pb/types'
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

const toolbarLoaded = ref(false)
const isLoading = ref(false)
const isInitializing = ref(true)

const state = await editStateProvider(adapter)
const keyboard = keyboardProvider()
const selection = selectionProvider(keyboard.isPressingSpace)
const dom = domProvider()
const storage = storageProvider()
const ui = uiProvider()
const animation = animationFrameProvider()
const types = await paragraphTypeProvider(
  adapter,
  selection.blocks,
  props.entityType,
  props.bundle,
)

useHead({
  bodyAttrs: {
    class: [isLoading.value ? 'pb-is-loading' : ''],
  },
})

onMounted(async () => {
  nextTick(() => {
    isInitializing.value = false
  })
})

onBeforeUnmount(() => {
  isInitializing.value = true
  toolbarLoaded.value = false
})

provide('isEditing', true)
provide('paragraphsBuilderEditContext', {
  eventBus,
  mutatedOptions: state.mutatedOptions,
})
provide<PbStore>('blokkliApp', {
  adapter,
  entityType: props.entityType,
  entityUuid: props.entityUuid,
  entityBundle: props.bundle,
  eventBus,
  runtimeConfig,
  state,
  dom,
  storage,
  types,
  selection,
  keyboard,
  ui,
  animation,
})
</script>
