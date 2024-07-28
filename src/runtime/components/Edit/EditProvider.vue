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
  <DragInteractions v-if="!isInitializing" />
  <AnimationCanvas v-if="!isInitializing" />
  <SystemRequirements />
  <slot :mutated-entity="mutatedEntity" />
</template>

<script lang="ts" setup generic="T">
import {
  watch,
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
import DraggableList from './DraggableList.vue'
import DragInteractions from './DragInteractions/index.vue'
import AnimationCanvas from './AnimationCanvas/index.vue'
import SystemRequirements from './SystemRequirements/index.vue'
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
import debugProvider from './../../helpers/debugProvider'
import dropAreasProvider from './../../helpers/dropAreaProvider'
import { eventBus } from '#blokkli/helpers/eventBus'
import '#blokkli/theme'
import '#blokkli/styles'
import getAdapter from '#blokkli/compiled-edit-adapter'
import {
  INJECT_APP,
  INJECT_EDIT_CONTEXT,
  INJECT_EDIT_FIELD_LIST_COMPONENT,
  INJECT_EDIT_LOGGER,
  INJECT_IS_EDITING,
} from '#blokkli/helpers/symbols'
import type { AdapterContext } from '#blokkli/adapter'

const props = withDefaults(
  defineProps<{
    entity?: T
    entityType: string
    entityUuid: string
    entityBundle: string
    language?: string
    isolate?: boolean
  }>(),
  {
    language: 'en',
    entity: undefined,
  },
)

const context = computed<AdapterContext>(() => {
  return {
    entityType: props.entityType,
    entityUuid: props.entityUuid,
    entityBundle: props.entityBundle,
    language: props.language,
  }
})
const adapter = getAdapter(context)

const route = useRoute()
const runtimeConfig = useRuntimeConfig().public.blokkli

const toolbarLoaded = ref(false)
const featuresLoaded = ref(false)
const isInitializing = ref(true)

const storage = storageProvider()
const debug = debugProvider(storage)
const features = featuresProvider()
const theme = themeProvider()
const commands = commandsProvider()
const tour = tourProvider()
const dropAreas = dropAreasProvider()
const broadcast = broadcastProvider()
const ui = uiProvider(storage)
const dom = domProvider(ui, debug)
const animation = animationProvider(ui)
const keyboard = keyboardProvider(animation)
const $t = textProvider(context)
const state = await editStateProvider(adapter, context)
const selection = selectionProvider(dom)
const types = await typesProvider(adapter, selection, context)

const mutatedEntity = computed(() => state.mutatedEntity.value || props.entity)

const onContextMenu = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault()
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    e.preventDefault()
  }
}

const setRootClasses = (unmount?: boolean) => {
  document.documentElement.classList.remove('bk-use-animations')

  if (ui.useAnimations.value && !unmount) {
    document.documentElement.classList.add('bk-use-animations')
  }
}

watch(ui.useAnimations, setRootClasses)

const baseLogger = debug.createLogger('EditProvider')

onMounted(() => {
  window.addEventListener('contextmenu', onContextMenu)
  if (props.isolate) {
    document.documentElement.classList.add('bk-isolate-provider')
  }
  nextTick(() => {
    isInitializing.value = false
  })

  document.documentElement.addEventListener('touchmove', onTouchMove)
  document.documentElement.addEventListener('touchstart', onTouchStart)
  setRootClasses()
  baseLogger.log('EditProvider mounted')
  dom.init()
})

onBeforeUnmount(() => {
  window.removeEventListener('contextmenu', onContextMenu)
  isInitializing.value = true
  toolbarLoaded.value = false
  document.documentElement.classList.remove('bk-isolate-provider')
  document.documentElement.removeEventListener('touchmove', onTouchMove)
  document.documentElement.removeEventListener('touchstart', onTouchStart)
  setRootClasses(true)
})
provide(INJECT_EDIT_LOGGER, baseLogger)

// Provide the edit <BlokkliField> component to it doesn't have to be loaded
// async every time.
provide(INJECT_EDIT_FIELD_LIST_COMPONENT, DraggableList)
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
  dropAreas,
  debug,
})
</script>
