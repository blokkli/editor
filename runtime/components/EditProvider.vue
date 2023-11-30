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
import { BlokkliApp } from '#pb/types'
import getAdapter from '#blokkli/compiled-edit-adapter'
import {
  INJECT_APP,
  INJECT_EDIT_CONTEXT,
  INJECT_IS_EDITING,
} from '../helpers/symbols'

const props = defineProps<{
  entityType: string
  entityUuid: string
  entityBundle: string
  language?: string
}>()

const context = computed(() => props)

const adapter = getAdapter(context)

const route = useRoute()
const runtimeConfig = useRuntimeConfig().public.paragraphsBuilder

const toolbarLoaded = ref(false)
const isInitializing = ref(true)

const state = await editStateProvider(adapter, context)
const keyboard = keyboardProvider()
const selection = selectionProvider()
const dom = domProvider()
const storage = storageProvider()
const ui = uiProvider()
const animation = animationFrameProvider()
const types = await paragraphTypeProvider(adapter, selection.blocks, context)

onMounted(() => {
  nextTick(() => {
    isInitializing.value = false
  })
})

onBeforeUnmount(() => {
  isInitializing.value = true
  toolbarLoaded.value = false
})

provide(INJECT_IS_EDITING, true)
provide(INJECT_EDIT_CONTEXT, {
  eventBus,
  mutatedOptions: state.mutatedOptions,
})
provide<BlokkliApp>(INJECT_APP, {
  adapter,
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
  context,
})
</script>
