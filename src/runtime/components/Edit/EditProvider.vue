<template>
  <Teleport to="#nuxt-root">
    <div id="bk-canvas-overlay" class="bk bk-canvas-overlay" />
  </Teleport>

  <Teleport to="body">
    <Transition :name="ui.useAnimations.value ? 'bk-loading' : undefined">
      <Loading v-if="showLoading" screen />
    </Transition>

    <div ref="mainLayoutElement" class="bk-main-layout">
      <Toolbar @loaded="toolbarLoaded = true" />
      <div ref="viewportElement" class="bk bk-viewport">
        <Messages />
      </div>
      <Actions v-if="!isInitializing" />
      <div id="bk-banner-container" class="bk">
        <div id="bk-banner-list">
          <Banner
            v-if="!state.stateAvailable.value"
            id="state-unavailable"
            icon="sad"
            scheme="red"
            :text="stateNotAvailableText"
          />
          <Banner
            v-if="viewOnlyBanner"
            id="view-only"
            :icon="viewOnlyBanner.icon"
            scheme="yellow"
            :text="viewOnlyBanner.text"
          />
        </div>
      </div>
      <Konami />
      <SystemRequirements />
    </div>
  </Teleport>

  <Indicators />
  <Features
    v-if="isReady"
    :key="route.fullPath"
    @loaded="featuresLoaded = true"
  />
  <AnimationCanvas v-if="!isInitializing" />
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
  onUnmounted,
  watch,
  useTemplateRef,
} from '#imports'
import type {
  BlokkliApp,
  EditPermission,
  EntityContext,
  ItemEditContext,
} from '#blokkli/types'
import Toolbar from './Toolbar/index.vue'
import Actions from './Actions/index.vue'
import Loading from './Loading/index.vue'
import Messages from './Messages/index.vue'
import Features from './Features/index.vue'
import Indicators from './Indicators/index.vue'
import DraggableList from './DraggableList.vue'
import AnimationCanvas from './AnimationCanvas/index.vue'
import SystemRequirements from './SystemRequirements/index.vue'
import Konami from './Konami/index.vue'
import Banner from './Banner/index.vue'
import animationProvider from './../../helpers/animationProvider'
import keyboardProvider from './../../helpers/keyboardProvider'
import selectionProvider from './../../helpers/selectionProvider'
import editStateProvider from './../../helpers/stateProvider'
import typesProvider from './../../helpers/typesProvider'
import elementProvider from './../../helpers/providers/element'
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
import blocksProvider from './../../helpers/providers/blocks'
import indicatorsProvider from './../../helpers/indicatorsProvider'
import pluginProvider from './../../helpers/pluginProvider'
import directiveProvider from './../../helpers/providers/directive'
import fieldsProvider from './../../helpers/providers/fields'
import { eventBus } from '#blokkli/helpers/eventBus'
import '#blokkli-build/styles.css'
import getAdapter from '#blokkli-build/edit-adapter'
import {
  INJECT_APP,
  INJECT_EDIT_CONTEXT,
  INJECT_EDIT_FIELD_LIST_COMPONENT,
  INJECT_EDIT_LOGGER,
  INJECT_ENTITY_CONTEXT,
  INJECT_GLOBAL_PROXY_MODE,
  INJECT_IS_EDITING,
  INJECT_PROVIDER_KEY,
} from '#blokkli/helpers/symbols'
import type { AdapterContext } from '#blokkli/adapter'
import { useBlockRegistration } from '#blokkli/helpers/composables/useBlockRegistration'
import { addElementClasses } from '#blokkli/helpers/addElementClasses'
import type { BlokkliIcon } from '#blokkli-build/icons'

const props = withDefaults(
  defineProps<{
    entity?: T
    entityType: string
    entityUuid: string
    entityBundle: string
    language?: string
    isolate?: boolean
    permissions: EditPermission[]
    providerEl: HTMLElement
  }>(),
  {
    language: 'en',
    entity: undefined,
  },
)

defineSlots<{
  default(props: { mutatedEntity: T; key: string }): any
}>()

const mainLayoutElement = useTemplateRef('mainLayoutElement')
const viewportElement = useTemplateRef('viewportElement')

const entityContext = computed<EntityContext>(() => {
  return {
    uuid: props.entityUuid,
    type: props.entityType,
    bundle: props.entityBundle,
  }
})

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
const state = await editStateProvider(
  adapter,
  context,
  $t,
  providerKey,
  props.permissions,
)
const storage = await storageProvider(adapter, context)
const plugins = pluginProvider()
const debug = debugProvider(storage)
const baseLogger = debug.createLogger('EditProvider')
baseLogger.log('Entity: ', context.value)
const element = elementProvider(debug)
const features = featuresProvider(storage)
const commands = commandsProvider()
const tour = tourProvider()
const dropAreas = dropAreasProvider()
const broadcast = broadcastProvider()
const ui = uiProvider(
  props.providerEl,
  storage,
  context,
  element,
  mainLayoutElement,
  viewportElement,
)
const dom = domProvider(ui, debug, definitions, state, element)
const theme = themeProvider(element)
const blocks = blocksProvider(state, dom, context)
const selection = selectionProvider(blocks)
const animation = animationProvider(ui, storage, selection, debug)
const keyboard = keyboardProvider(animation)
const types = await typesProvider(adapter, selection, context)
const indicators = indicatorsProvider()
const directive = directiveProvider(debug, ui)
const fields = fieldsProvider(state, dom, types)

const mutatedEntity = computed(() => {
  return {
    ...(props.entity ?? {}),
    ...(state.mutatedEntity.value ?? {}),
  }
})

const isReady = computed(
  () =>
    !isInitializing.value &&
    dom.isReady.value &&
    directive.isReady.value &&
    toolbarLoaded.value &&
    mainLayoutElement.value,
)

watch(isReady, (v) => {
  if (v) {
    baseLogger.log('is ready')
  }
})

const showLoading = computed(() => {
  return !isReady.value || !featuresLoaded.value
})

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

/**
 * Set a custom property on the given element.
 */
function setElementSymbolProperty(
  el: HTMLElement,
  symbol: symbol,
  value?: any,
) {
  // @ts-expect-error Custom property
  el[symbol] = value
}

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
const app: BlokkliApp = {
  $t,
  adapter,
  animation,
  broadcast,
  commands,
  context,
  debug,
  definitions,
  dom,
  dropAreas,
  element,
  eventBus,
  directive,
  features,
  indicators,
  keyboard,
  plugins,
  runtimeConfig,
  selection,
  blocks,
  state,
  storage,
  theme,
  tour,
  types,
  ui,
  fields,
}

provide<BlokkliApp>(INJECT_APP, app)

function textWithHighlight(title: string, text: string): string {
  return `<strong>${title}</strong> ${text}`
}

const stateNotAvailableText = computed(() => {
  return textWithHighlight(
    $t('stateUnavailableTitle', 'The edit state could not be loaded.'),
    $t(
      'stateUnavailableText',
      'This could be due to missing permissions or a temporary problem. Please try again later.',
    ),
  )
})

const viewOnlyBanner = computed<{ text: string; icon: BlokkliIcon } | null>(
  () => {
    if (props.permissions.includes('edit')) {
      return null
    }

    if (props.permissions.includes('review')) {
      // User can only review the changes (e.g. add/view comments).
      return {
        text: textWithHighlight(
          $t('viewBannerReviewTitle', 'You are in review mode.'),
          $t(
            'viewBannerReviewText',
            'You can view and add comments but cannot edit content.',
          ),
        ),
        icon: 'comment',
      }
    } else if (props.permissions.includes('view')) {
      // User can only view the changes (e.g. only view comments, not add).
      return {
        text: textWithHighlight(
          $t('viewBannerViewTitle', 'You are in view-only mode.'),
          $t(
            'viewBannerViewText',
            'You can view comments but cannot edit content.',
          ),
        ),
        icon: 'eye',
      }
    }

    return null
  },
)

const isProxyMode = computed(() => ui.isProxyMode.value)
provide(INJECT_GLOBAL_PROXY_MODE, isProxyMode)

if (import.meta.hot) {
  import.meta.hot.accept('#blokkli/runtime-helpers', () => {})
  import.meta.hot.accept('#blokkli/helpers/runtimeHelpers', () => {})
  import.meta.hot.on('vite:afterUpdate', (payload) => {
    const hasUpdatedRenderer = payload.updates.find((v) =>
      v.path.includes('/Renderer/'),
    )
    if (hasUpdatedRenderer) {
      animation.reset()
    }
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
  })
}

onMounted(async () => {
  baseLogger.log('onMounted - START')
  // We need to store the app and entity context in the DOM, so that the
  // directives used directly as a child of <BlokkliProvider> have access to
  // them. Since their parent vnode in this scenario is the component that uses
  // BlokkliProvider, they don't have access to stuff that we inject here.
  // For this reason, we "provide" these injections via the DOM. Hacky, but it
  // works.
  setElementSymbolProperty(props.providerEl, INJECT_APP, app)
  setElementSymbolProperty(
    props.providerEl,
    INJECT_ENTITY_CONTEXT,
    entityContext.value,
  )
  window.addEventListener('contextmenu', onContextMenu)
  document.documentElement.addEventListener('touchmove', onTouchMove)
  document.documentElement.addEventListener('touchstart', onTouchStart)
  dom.init()
  directive.init()
  await nextTick()
  isInitializing.value = false
  broadcast.emit('editorLoaded', { uuid: props.entityUuid })
  baseLogger.log('onMounted - END')
})

onBeforeUnmount(() => {
  window.removeEventListener('contextmenu', onContextMenu)
  isInitializing.value = true
  toolbarLoaded.value = false
  document.documentElement.removeEventListener('touchmove', onTouchMove)
  document.documentElement.removeEventListener('touchstart', onTouchStart)
})

onUnmounted(() => {
  // Remove the "DOM injections" again.
  // The directives use a "beforeUnmount" hook, so they will still have the
  // chance to unregister themselves.
  setElementSymbolProperty(props.providerEl, INJECT_APP)
  setElementSymbolProperty(props.providerEl, INJECT_ENTITY_CONTEXT)
})
</script>
