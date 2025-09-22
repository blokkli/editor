<template>
  <Teleport to="body">
    <Transition name="bk-loading">
      <Loading
        v-if="isInitializing || !toolbarLoaded || !featuresLoaded"
        screen
      />
    </Transition>

    <div id="bk-banner-container">
      <Messages />
      <div v-if="!state.stateAvailable.value" class="bk-state-unavailable">
        <h2>
          {{
            $t('stateUnavailableTitle', 'The edit state could not be loaded.')
          }}
        </h2>
        <p>
          {{
            $t(
              'stateUnavailableText',
              'This could be due to missing permissions or a temporary problem. Please try again later.',
            )
          }}
        </p>
      </div>
    </div>
  </Teleport>
  <Actions v-if="!isInitializing" />
  <Toolbar @loaded="toolbarLoaded = true" />
  <AppMenu v-if="toolbarLoaded" />
  <Indicators />
  <Features
    v-if="!isInitializing && toolbarLoaded"
    :key="route.fullPath"
    @loaded="featuresLoaded = true"
  />
  <DragInteractions v-if="!isInitializing" />
  <AnimationCanvas v-if="!isInitializing" />
  <SystemRequirements />
  <slot
    v-if="!isInitializing"
    :key="definitions.renderKey.value"
    :mutated-entity="mutatedEntity"
  />
</template>

<script lang="ts" setup generic="T">
import {
  ref,
  computed,
  provide,
  onMounted,
  onBeforeUnmount,
  useRoute,
  useRuntimeConfig,
  nextTick,
  inject,
} from '#imports'
import type { BlokkliApp, ItemEditContext } from '#blokkli/types'
import Toolbar from './Toolbar/index.vue'
import Actions from './Actions/index.vue'
import Loading from './Loading/index.vue'
import Messages from './Messages/index.vue'
import Features from './Features/index.vue'
import Indicators from './Indicators/index.vue'
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
import definitionProvider from './../../helpers/definitionProvider'
import dropAreasProvider from './../../helpers/dropAreaProvider'
import indicatorsProvider from './../../helpers/indicatorsProvider'
import { eventBus } from '#blokkli/helpers/eventBus'
import '#blokkli-build/styles.css'
import getAdapter from '#blokkli-build/edit-adapter'
import {
  INJECT_APP,
  INJECT_EDIT_CONTEXT,
  INJECT_EDIT_FIELD_LIST_COMPONENT,
  INJECT_EDIT_LOGGER,
  INJECT_GLOBAL_PROXY_MODE,
  INJECT_IS_EDITING,
  INJECT_PROVIDER_KEY,
} from '#blokkli/helpers/symbols'
import type { AdapterContext } from '#blokkli/adapter'
import { useBlockRegistration } from '#blokkli/helpers/composables/useBlockRegistration'
import { addElementClasses } from '#blokkli/helpers/addElementClasses'

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

defineSlots<{
  default(props: { mutatedEntity: T; key: string }): any
}>()

const context = computed<AdapterContext>(() => {
  return {
    entityType: props.entityType,
    entityUuid: props.entityUuid,
    entityBundle: props.entityBundle,
    language: props.language,
  }
})
const adapter = await getAdapter(context)
const providerKey = inject(INJECT_PROVIDER_KEY, '')

const route = useRoute()
const runtimeConfig = useRuntimeConfig().public.blokkli

const toolbarLoaded = ref(false)
const featuresLoaded = ref(false)
const isInitializing = ref(true)

const definitions = definitionProvider()
const $t = textProvider(context)
const state = await editStateProvider(adapter, context, $t, providerKey)
const storage = storageProvider()
const debug = debugProvider(storage)
const features = featuresProvider(storage)
const theme = themeProvider()
const commands = commandsProvider()
const tour = tourProvider()
const dropAreas = dropAreasProvider()
const broadcast = broadcastProvider()
const ui = uiProvider(storage, state, context)
const dom = domProvider(ui, debug, definitions)
const animation = animationProvider(ui)
const keyboard = keyboardProvider(animation)
const selection = selectionProvider(dom)
const types = await typesProvider(adapter, selection, context)
const indicators = indicatorsProvider()

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

const shouldIsolate = computed(() => props.isolate)

addElementClasses(
  document.documentElement,
  'bk-use-animations',
  ui.useAnimations,
)
addElementClasses(
  document.documentElement,
  'bk-isolate-provider',
  shouldIsolate,
)

const baseLogger = debug.createLogger('EditProvider')

onMounted(() => {
  window.addEventListener('contextmenu', onContextMenu)
  document.documentElement.addEventListener('touchmove', onTouchMove)
  document.documentElement.addEventListener('touchstart', onTouchStart)
  baseLogger.log('EditProvider mounted')
  dom.init()
  isInitializing.value = false
  broadcast.emit('editorLoaded', { uuid: props.entityUuid })
})

onBeforeUnmount(() => {
  window.removeEventListener('contextmenu', onContextMenu)
  isInitializing.value = true
  toolbarLoaded.value = false
  document.documentElement.removeEventListener('touchmove', onTouchMove)
  document.documentElement.removeEventListener('touchstart', onTouchStart)
})
provide(INJECT_EDIT_LOGGER, baseLogger)

// Provide the edit <BlokkliField> component to it doesn't have to be loaded
// async every time.
provide(INJECT_EDIT_FIELD_LIST_COMPONENT, DraggableList)
provide(INJECT_IS_EDITING, true)
provide<ItemEditContext>(INJECT_EDIT_CONTEXT, {
  eventBus,
  mutatedOptions: state.mutatedOptions,
  dom,
  definitions,
  useBlockRegistration,
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
  definitions,
  indicators,
})

const isProxyMode = computed(() => ui.isProxyMode.value)
provide(INJECT_GLOBAL_PROXY_MODE, isProxyMode)

if (import.meta.hot) {
  function onAfterUpdate() {
    try {
      eventBus.emit('state:reloaded')
      dom.updateVisibleRects()
      nextTick(() => {
        const uuid = selection.uuids.value[0]
        if (uuid) {
          eventBus.emit('scrollIntoView', {
            uuid,
            center: true,
          })
        }
      })
    } catch {
      // Noop.
    }
  }
  import.meta.hot.accept('#blokkli/runtime-helpers', () => {})
  import.meta.hot.accept('#blokkli/helpers/runtimeHelpers', () => {})
  import.meta.hot.on('vite:afterUpdate', onAfterUpdate)
}
</script>
