<template>
  <Teleport to="#nuxt-root">
    <div id="bk-canvas-overlay" class="bk bk-canvas-overlay" />
  </Teleport>

  <Teleport to="body">
    <Transition :name="ui.useAnimations.value ? 'bk-loading' : undefined">
      <Loading v-if="showLoading" screen />
    </Transition>

    <div
      ref="mainLayoutElement"
      class="bk-vars bk-main-layout"
      :lang="ui.interfaceLanguage.value"
    >
      <Toolbar @loaded="toolbarLoaded = true" />
      <div ref="viewportElement" class="bk bk-viewport">
        <Messages />
      </div>
      <Actions v-if="!isInitializing" />
      <div
        id="bk-banner-container"
        class="bk relative z-translations-banner-mobile lg:z-translations-banner-desktop grid pointer-events-auto"
        :style="{
          gridArea: 'banner',
        }"
      >
        <div id="bk-banner-list" class="grid gap-10">
          <Banner
            v-if="!state.stateAvailable.value"
            id="state-unavailable"
            scheme="red"
          >
            <BannerInner
              icon="bk_mdi_sentiment_dissatisfied"
              :text="stateNotAvailableText"
            />
          </Banner>
          <Banner v-if="viewOnlyBanner" id="view-only" scheme="yellow">
            <BannerInner
              :icon="viewOnlyBanner.icon"
              :text="viewOnlyBanner.text"
            />
          </Banner>
        </div>
      </div>

      <Konami />
      <SystemRequirements />
      <Overlay />
    </div>
  </Teleport>

  <Indicators />
  <FeaturesRenderer
    v-if="isReady"
    :key="route.fullPath"
    @loaded="featuresLoaded = true"
  />
  <AnimationCanvas v-if="!isInitializing" />
  <slot
    v-if="!isInitializing"
    :key="definitions.renderKey.value"
    :mutated-entity
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
  nextTick,
  inject,
  onUnmounted,
  watch,
  useTemplateRef,
} from '#imports'
import type { EntityContext } from '#blokkli/types'
import Toolbar from './Toolbar/index.vue'
import Actions from './Actions/index.vue'
import Loading from './Loading/index.vue'
import Messages from './Messages/index.vue'
import FeaturesRenderer from './FeaturesRenderer/index.vue'
import Indicators from './Indicators/index.vue'
import DraggableList from './DraggableList.vue'
import AnimationCanvas from './AnimationCanvas/index.vue'
import SystemRequirements from './SystemRequirements/index.vue'
import Overlay from './Overlay/index.vue'
import Konami from './Konami/index.vue'
import Banner from './Banner/index.vue'
import BannerInner from './Banner/Inner.vue'
import animationProvider from '#blokkli/editor/providers/animation'
import keyboardProvider from '#blokkli/editor/providers/keyboard'
import selectionProvider from '#blokkli/editor/providers/selection'
import editStateProvider from '#blokkli/editor/providers/state'
import typesProvider from '#blokkli/editor/providers/types'
import elementProvider from '#blokkli/editor/providers/element'
import domProvider from '#blokkli/editor/providers/dom'
import textProvider from '#blokkli/editor/providers/texts'
import storageProvider from '#blokkli/editor/providers/storage'
import uiProvider from '#blokkli/editor/providers/ui'
import broadcastProvider from '#blokkli/editor/providers/broadcast'
import featuresProvider from '#blokkli/editor/providers/features'
import themeProvider from '#blokkli/editor/providers/theme'
import commandsProvider from '#blokkli/editor/providers/commands'
import tourProvider from '#blokkli/editor/providers/tour'
import debugProvider from '#blokkli/editor/providers/debug'
import definitionProvider from '#blokkli/editor/providers/definition'
import blocksProvider from '#blokkli/editor/providers/blocks'
import indicatorsProvider from '#blokkli/editor/providers/indicators'
import pluginProvider from '#blokkli/editor/providers/plugin'
import directiveProvider from '#blokkli/editor/providers/directive'
import fieldsProvider from '#blokkli/editor/providers/fields'
import iconsProvider from '#blokkli/editor/providers/icons'
import permissionsProvider from '#blokkli/editor/providers/permissions'
import adaptersProvider from '#blokkli/editor/providers/adapters'
import analyzeProviderFn from '#blokkli/editor/providers/analyze'
import readabilityProviderFn from '#blokkli/editor/providers/readability'
import fieldValueProviderFn from '#blokkli/editor/providers/fieldValue'
import dragdropProvider from '#blokkli/editor/providers/dragdrop'
import { eventBus } from '#blokkli/editor/events'
import '#blokkli-build/styles.css'
import getAdapter from '#blokkli-build/edit-adapter'
import getExtensions from '#blokkli-build/adapter-extensions'
import {
  INJECT_ALL_COMPONENTS_CHUNK,
  INJECT_APP,
  INJECT_EDIT_CONTEXT,
  INJECT_EDIT_FIELD_LIST_COMPONENT,
  INJECT_EDIT_LOGGER,
  INJECT_ENTITY_CONTEXT,
  INJECT_GLOBAL_PROXY_MODE,
  INJECT_IS_EDITING,
  INJECT_ITEM_PROPS_OVERRIDE,
  INJECT_PROVIDER_KEY,
} from '#blokkli/helpers/injections'
import type { AdapterContext } from '#blokkli/editor/adapter'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { allComponents } from '#blokkli-build/chunk-editing'
import { falsy } from '#blokkli/helpers'
import {
  addElementClasses,
  useBlockRegistration,
} from '#blokkli/editor/composables'
import type { BlokkliApp } from '../types/app'
import type { EditPermission } from '#blokkli/types/provider'
import type { ValidProviderTypes } from '#blokkli-build/generated-types'

const props = withDefaults(
  defineProps<{
    entity?: T
    entityType: string
    entityUuid: string
    entityBundle: string
    language?: string
    isolate?: boolean
    permissions: Array<EditPermission | null>
    providerEl: HTMLElement
    providerType: ValidProviderTypes
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
const adapters = await adaptersProvider(adapter, getExtensions, context)
const providerKey = inject(INJECT_PROVIDER_KEY, '')

const route = useRoute()

const toolbarLoaded = ref(false)
const featuresLoaded = ref(false)
const isInitializing = ref(true)

const definitions = definitionProvider(props.providerType)
const $t = textProvider(context)
const state = await editStateProvider(
  eventBus,
  adapter,
  context,
  $t,
  providerKey,
  props.permissions.filter(falsy),
)
const storage = await storageProvider(adapter, context)
const plugins = pluginProvider()
const debug = debugProvider(eventBus, storage)
const baseLogger = debug.createLogger('EditProvider')
baseLogger.log('Entity: ', context.value)
const element = elementProvider(debug)
const features = featuresProvider(storage)
const commands = commandsProvider()
const tour = tourProvider()
const broadcast = broadcastProvider()
const icons = iconsProvider()
const ui = uiProvider(
  eventBus,
  props.providerEl,
  storage,
  context,
  element,
  mainLayoutElement,
  viewportElement,
)
const dom = domProvider(ui, debug, state, element)
const theme = themeProvider(element)
const blocks = blocksProvider(state, dom, context)
const permissionsInstance = await permissionsProvider(adapter, blocks)
const selection = selectionProvider(blocks, permissionsInstance)
const keyboard = keyboardProvider(eventBus)
const animation = animationProvider(
  eventBus,
  ui,
  storage,
  selection,
  debug,
  keyboard,
)
const types = await typesProvider(adapter, selection, context)
const indicators = indicatorsProvider()
const directive = directiveProvider(debug, ui)
const fields = fieldsProvider(dom, types, state)
const fieldValue = fieldValueProviderFn(
  directive,
  state,
  types,
  definitions,
  blocks,
)
const readability = readabilityProviderFn(
  adapters,
  context,
  directive,
  fieldValue,
)
const analyze = analyzeProviderFn(adapters, state, ui, context, $t, readability)
const dragdrop = dragdropProvider()

const mutatedEntityProps = computed(() => state.mutatedItemProps.HOST)

const mutatedEntity = computed(() => {
  return {
    ...props.entity,
    ...state.mutatedEntity.value,
    ...mutatedEntityProps.value,
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

// Provide an object that contains all block component imports inlined,
// without any async imports. This is needed during editing because there
// is a weird behaviour in field components where the order of blocks sometimes
// is broken during updates. The BlokkliItem component injects this and passes
// it to the getComponent method that will return it from the provided object
// instead of loading the component from the chunks.
provide(INJECT_ALL_COMPONENTS_CHUNK, allComponents)

// Provide the edit <BlokkliField> component to it doesn't have to be loaded
// async every time.
provide(INJECT_EDIT_FIELD_LIST_COMPONENT, DraggableList)
provide(INJECT_IS_EDITING, true)
provide(INJECT_EDIT_CONTEXT, {
  eventBus,
  mutatedOptions: state.mutatedOptions,
  dom,
  definitions,
  useBlockRegistration,
})
const app: BlokkliApp = {
  $t,
  adapter,
  adapters,
  animation,
  broadcast,
  commands,
  context,
  debug,
  definitions,
  dom,
  element,
  eventBus,
  directive,
  features,
  indicators,
  keyboard,
  plugins,
  selection,
  blocks,
  state,
  storage,
  theme,
  tour,
  types,
  ui,
  fields,
  icons,
  permissions: permissionsInstance,
  analyze,
  readability,
  fieldValue,
  dragdrop,
}

provide(INJECT_APP, app)

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
        icon: 'bk_mdi_comment',
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
        icon: 'bk_mdi_visibility',
      }
    }

    return null
  },
)

const isProxyMode = computed(() => ui.isProxyMode.value)
provide(INJECT_GLOBAL_PROXY_MODE, isProxyMode)
provide(INJECT_ITEM_PROPS_OVERRIDE, state.mutatedItemProps)

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

<style lang="postcss">
.bk.bk-viewport {
  @apply relative;
  grid-area: viewport;
}

.bk-vars.bk-main-layout {
  @apply fixed top-0 left-0 w-screen h-screen z-main-layout grid pointer-events-none;

  grid-template-areas:
    'toolbar toolbar      toolbar       toolbar     toolbar       right'
    'left    mode         mode          mode        sidebar-right right'
    'left    sidebar-left viewport      scrollbar-y sidebar-right right'
    'left    sidebar-left banner        scrollbar-y sidebar-right right'
    'left breadcrumbs breadcrumbs   breadcrumbs sidebar-right right';
  grid-template-columns: auto auto 1fr 16px auto 50px;
  grid-template-rows: 50px auto 1fr auto auto;
}

.bk.bk-canvas-overlay {
  @apply fixed top-0 left-0 size-full z-canvas-overlay;
}

html.bk-isolate-provider {
  [data-provider-uuid]:not([data-blokkli-provider-active='true']) {
    @apply !hidden;
  }
}

html.bk-html-root:not(.bk-use-animations) {
  *,
  *:before,
  *:after {
    transition: none !important;
  }
}
</style>
