<template>
  <Teleport to="body">
    <Transition name="bk-loading">
      <Loading
        v-if="isInitializing || !toolbarLoaded || !featuresLoaded"
        screen
      />
    </Transition>
  </Teleport>
  <Actions v-if="!isInitializing" />
  <Messages />
  <Toolbar @loaded="toolbarLoaded = true" />
  <AppMenu v-if="toolbarLoaded" />
  <Features
    v-if="!isInitializing && toolbarLoaded"
    :key="route.fullPath"
    @loaded="featuresLoaded = true"
  />
  <Animator v-if="!isInitializing" />
  <slot />
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  provide,
  onMounted,
  onBeforeUnmount,
  nextTick,
  useRoute,
  useRuntimeConfig,
} from '#imports'
import type { BlokkliApp } from '#blokkli/types'
import Toolbar from './Toolbar/index.vue'
import Actions from './Actions/index.vue'
import Loading from './Loading/index.vue'
import Messages from './Messages/index.vue'
import Features from './Features/index.vue'
import AppMenu from './AppMenu/index.vue'
import Animator from './Animator/index.vue'
import animationProvider from './../../helpers/animationProvider'
import keyboardProvider from './../../helpers/keyboardProvider'
import selectionProvider from './../../helpers/selectionProvider'
import editStateProvider from './../../helpers/stateProvider'
import typesProvider from './../../helpers/typesProvider'
import domProvider from './../../helpers/domProvider'
import textProvider from './../../helpers/textProvider'
import storageProvider from './../../helpers/storageProvider'
import uiProvider from './../../helpers/uiProvider'
import broadcastProvider from './../../helpers/broadcastProvider'
import featuresProvider from './../../helpers/featuresProvider'
import themeProvider from './../../helpers/themeProvider'
import commandsProvider from './../../helpers/commandsProvider'
import tourProvider from './../../helpers/tourProvider'
import { eventBus } from '#blokkli/helpers/eventBus'
import '#blokkli/theme'
import '#blokkli/styles'
import getAdapter from '#blokkli/compiled-edit-adapter'
import {
  INJECT_APP,
  INJECT_EDIT_CONTEXT,
  INJECT_IS_EDITING,
} from '#blokkli/helpers/symbols'

const props = withDefaults(
  defineProps<{
    entityType: string
    entityUuid: string
    entityBundle: string
    language?: string
  }>(),
  {
    language: 'en',
  },
)

const context = computed(() => props)
const adapter = getAdapter(context)

const route = useRoute()
const runtimeConfig = useRuntimeConfig().public.blokkli

const toolbarLoaded = ref(false)
const featuresLoaded = ref(false)
const isInitializing = ref(true)

const broadcast = broadcastProvider()
const animation = animationProvider()
const keyboard = keyboardProvider(animation)
const dom = domProvider()
const storage = storageProvider()
const ui = uiProvider(storage)
const $t = textProvider(context)
const state = await editStateProvider(adapter, context)
const selection = selectionProvider(dom, state)
const types = await typesProvider(adapter, selection)
const features = featuresProvider()
const theme = themeProvider()
const commands = commandsProvider()
const tour = tourProvider()

const onContextMenu = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
}

onMounted(() => {
  window.addEventListener('contextmenu', onContextMenu)
  nextTick(() => {
    isInitializing.value = false
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('contextmenu', onContextMenu)
  isInitializing.value = true
  toolbarLoaded.value = false
})

provide(INJECT_IS_EDITING, true)
provide(INJECT_EDIT_CONTEXT, {
  eventBus,
  mutatedOptions: state.mutatedOptions,
  dom,
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
  $t,
  broadcast,
  features,
  theme,
  commands,
  tour,
})
</script>
