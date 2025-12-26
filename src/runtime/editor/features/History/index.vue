<template>
  <PluginSidebar
    id="history"
    v-slot="{ scrolledToEnd }"
    :title="$t('history', 'History')"
    edit-only
    :tour-text="
      $t(
        'historyTourText',
        'See a list of all changes made so far and switch back and forth between changes.',
      )
    "
    icon="bk_mdi_history"
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
    icon="bk_mdi_undo"
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
    icon="bk_mdi_redo"
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
import { PluginSidebar, PluginToolbarButton } from '#blokkli/editor/plugins'
import HistoryList from './List/index.vue'
import { MOUSE_BUTTON } from '#blokkli/editor/helpers/dom'

const { adapter, settings } = defineBlokkliFeature({
  id: 'history',
  icon: 'bk_mdi_history',
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

const { state, $t, ui, selection, eventBus } = useBlokkli()

const { mutations, currentMutationIndex, mutateWithLoadingState } = state

const mutationsCount = computed(() => mutations.value.length)
const useMouseForHistory = computed(() => settings.value.useMouseButtons)
const canUndo = computed(
  () => currentMutationIndex.value >= 0 && state.canEdit.value,
)
const canRedo = computed(
  () =>
    currentMutationIndex.value < mutationsCount.value - 1 &&
    state.canEdit.value,
)

const selectionAtHistoryIndex = new Map<number, string[]>()

function updateCurrentHistorySelection() {
  selectionAtHistoryIndex.set(currentMutationIndex.value, [
    ...selection.uuids.value,
  ])
}

function setSelectionFromHistoryIndex(index: number) {
  const selection = selectionAtHistoryIndex.get(index)
  if (selection?.length) {
    eventBus.emit('select', selection)
    const firstUuid = selection[0]!
    eventBus.emit('scrollIntoView', { uuid: firstUuid })
  }
}

async function setHistoryIndex(newIndex: number) {
  updateCurrentHistorySelection()
  await mutateWithLoadingState(() => adapter.setHistoryIndex(newIndex))
  setSelectionFromHistoryIndex(newIndex)
}

async function undo() {
  await setHistoryIndex(currentMutationIndex.value - 1)
}

async function redo() {
  await setHistoryIndex(currentMutationIndex.value + 1)
}

const onMouseUp = (e: MouseEvent) => {
  if (e.button === MOUSE_BUTTON.FOURTH) {
    // History back button on the mouse.
    e.preventDefault()
    e.stopPropagation()
    if (canUndo.value) {
      undo()
    }
  } else if (e.button === MOUSE_BUTTON.FIFTH) {
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
watch(selection.uuids, updateCurrentHistorySelection)
watch(mutationsCount, (count) => {
  for (const [index] of selectionAtHistoryIndex) {
    if (index >= count) {
      selectionAtHistoryIndex.delete(index)
    }
  }
})

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
