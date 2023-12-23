<template>
  <Loading v-if="isInitializing || !toolbarLoaded || !featuresLoaded" />
  <Actions v-if="!isInitializing" />
  <Messages />
  <Toolbar @loaded="toolbarLoaded = true" />
  <AppMenu />
  <AddList />
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
} from '#imports'
import type { BlokkliApp } from '#blokkli/types'
import Toolbar from './Toolbar/index.vue'
import AddList from './AddList/index.vue'
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

import { eventBus } from '#blokkli/helpers/eventBus'
import '#blokkli/styles'
import getAdapter from '#blokkli/compiled-edit-adapter'
import {
  INJECT_APP,
  INJECT_EDIT_CONTEXT,
  INJECT_IS_EDITING,
} from '#blokkli/helpers/symbols'

const props = defineProps<{
  entityType: string
  entityUuid: string
  entityBundle: string
  language?: string
}>()

const context = computed(() => props)
const adapter = getAdapter(context)

const route = useRoute()
const runtimeConfig = useRuntimeConfig().public.blokkli

const toolbarLoaded = ref(false)
const featuresLoaded = ref(false)
const isInitializing = ref(true)

const animation = animationProvider()
const keyboard = keyboardProvider(animation)
const dom = domProvider()
const selection = selectionProvider(dom)
const storage = storageProvider()
const ui = uiProvider()
const text = textProvider(context)
const types = await typesProvider(adapter, selection)
const state = await editStateProvider(adapter, context)

const originalThemeColor = ref('')
const THEME_COLOR = '#020617'

const onContextMenu = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
}

onMounted(() => {
  window.addEventListener('contextmenu', onContextMenu)
  const el = document.head.querySelectorAll('[name="theme-color"]')
  if (el instanceof HTMLMetaElement) {
    originalThemeColor.value = el.content
    el.content = THEME_COLOR
  } else {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = THEME_COLOR
    document.getElementsByTagName('head')[0].appendChild(meta)
  }
  nextTick(() => {
    isInitializing.value = false
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('contextmenu', onContextMenu)
  isInitializing.value = true
  toolbarLoaded.value = false
  const el = document.head.querySelectorAll('[name="theme-color"]')
  if (el instanceof HTMLMetaElement) {
    if (originalThemeColor.value) {
      el.content = originalThemeColor.value
    } else {
      el.remove()
    }
  }
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
  text,
})
</script>
