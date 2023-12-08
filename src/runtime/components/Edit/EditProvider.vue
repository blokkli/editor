<template>
  <Loading v-if="isInitializing || !toolbarLoaded || !featuresLoaded" />
  <Actions />
  <Messages />
  <Toolbar @loaded="toolbarLoaded = true" />
  <Features
    v-if="!isInitializing && toolbarLoaded"
    :key="route.fullPath"
    @loaded="featuresLoaded = true"
  />
  <slot v-if="!isInitializing" />
</template>

<script lang="ts" setup>
import Toolbar from './Toolbar/index.vue'
import Actions from './Actions/index.vue'
import Messages from './Messages/index.vue'
import Loading from './Loading/index.vue'
import Features from './Features/index.vue'
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
import { Sortable } from '#blokkli/sortable'
import { BlokkliApp } from '#blokkli/types'
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

const keyboard = keyboardProvider()
const selection = selectionProvider()
const dom = domProvider()
const storage = storageProvider()
const ui = uiProvider()
const animation = animationProvider()
const text = textProvider(context)
const types = await typesProvider(adapter, selection.blocks, context)
const state = await editStateProvider(adapter, context)

// Hacky workaround because of Sortable interfering with Vue rendering.
// We have to remove elements that were altered by Sortable right before the
// DraggableList component was re-rendered, which leads to orphaned elements.
// This seems to be happening mostly due to the MultiDrag Sortable plugin and
// can be reproduced when selecting multiple items and moving them on top
// another item when a transform plugin is applied.
watch(state.refreshKey, (newKey) => {
  nextTick(() => {
    document.querySelectorAll('[data-refresh-key]').forEach((el) => {
      if (el instanceof HTMLElement) {
        const dataRefreshKey = el.dataset.refreshKey
        if (dataRefreshKey !== newKey) {
          Sortable.utils.deselect(el)
          el.remove()
        }
      }
    })
  })
})

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
  text,
})
</script>
