<template>
  <PluginSidebar
    id="history"
    v-slot="{ scrolledToEnd }"
    :title="$t('history', 'History')"
    :tour-text="
      $t(
        'historyTourText',
        'See a list of all changes made so far and switch back and forth between changes.',
      )
    "
    icon="history"
    weight="-800"
  >
    <HistoryList :scrolled-to-end="scrolledToEnd" />
  </PluginSidebar>

  <PluginToolbarButton
    id="undo"
    :title="$t('historyUndo', 'Undo')"
    meta
    key-code="Z"
    region="before-title"
    :disabled="!canUndo"
    :tour-text="$t('historyUndoTourText', 'Undo the last change.')"
    icon="undo"
    @click="undo"
  />

  <PluginToolbarButton
    id="redo"
    :title="$t('historyRedo', 'Redo')"
    meta
    shift
    key-code="Z"
    region="before-title"
    :disabled="!canRedo"
    :tour-text="$t('historyRedoTourText', 'Redo the previous change.')"
    icon="redo"
    @click="redo"
  />
</template>

<script lang="ts" setup>
import {
  computed,
  useBlokkli,
  watch,
  defineBlokkliFeature,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import { PluginSidebar, PluginToolbarButton } from '#blokkli/plugins'
import HistoryList from './List/index.vue'

const { adapter, settings } = defineBlokkliFeature({
  id: 'history',
  icon: 'history',
  label: 'History',
  requiredAdapterMethods: ['setHistoryIndex'],
  description:
    'Implements support for history features (undo, redo, list of mutations).',
  settings: {
    useMouseButtons: {
      type: 'checkbox',
      label: 'Use mouse buttons for undo/redo',
      description:
        'When enabled you can use the backwards/forwards buttons on your mouse to undo and redo.',
      default: true,
      group: 'behavior',
      viewports: ['desktop'],
    },
  },
})

const { state, $t, ui } = useBlokkli()

const { mutations, currentMutationIndex, mutateWithLoadingState } = state

const useMouseForHistory = computed(() => settings.value.useMouseButtons)
const canUndo = computed(() => currentMutationIndex.value >= 0)
const canRedo = computed(
  () => currentMutationIndex.value < mutations.value.length - 1,
)

function undo() {
  mutateWithLoadingState(() =>
    adapter.setHistoryIndex(currentMutationIndex.value - 1),
  )
}

function redo() {
  mutateWithLoadingState(() =>
    adapter.setHistoryIndex(currentMutationIndex.value + 1),
  )
}

const onMouseUp = (e: MouseEvent) => {
  if (e.button === 3) {
    // History back button on the mouse.
    e.preventDefault()
    e.stopPropagation()
    if (canUndo.value) {
      undo()
    }
  } else if (e.button === 4) {
    // History forward button on the mouse.
    e.preventDefault()
    e.stopPropagation()
    if (canRedo.value) {
      redo()
    }
  }
}

const setupMouseListeners = () => {
  document.removeEventListener('mouseup', onMouseUp)
  if (useMouseForHistory.value && ui.isDesktop.value) {
    document.addEventListener('mouseup', onMouseUp)
  }
}

watch(useMouseForHistory, setupMouseListeners)

onMounted(() => {
  setupMouseListeners()
})

onBeforeUnmount(() => {
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<script lang="ts">
export default {
  name: 'History',
}
</script>
