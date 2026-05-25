<template>
  <Sortli
    id="blokkli-add-list-actions"
    data-test="add-list-actions"
    :build-item="buildItemAction"
  >
    <ActionButton
      v-for="action in actions"
      :key="action.id"
      :action="action"
      :selectable-bundles
      :help-active
      @help="onHelp(action, $event)"
      @start-help="onStartHelp(action, $event)"
    />
  </Sortli>
</template>

<script setup lang="ts">
import { Sortli } from '#blokkli/editor/components'
import ActionButton from './Action.vue'
import type { AddListHelp, DraggableActionItem } from '../types'
import type { AddAction } from '#blokkli/editor/types/actions'

const props = defineProps<{
  selectableBundles: string[]
  actions: AddAction[]
  helpActive: boolean
}>()

const emit = defineEmits<{
  (e: 'help' | 'startHelp', date: AddListHelp): void
}>()

function onStartHelp(action: AddAction, element: HTMLElement) {
  if (props.helpActive) {
    return
  }
  emit('startHelp', {
    type: 'action',
    id: action.id,
    element,
  })
}

function onHelp(action: AddAction, element: HTMLElement) {
  if (!props.helpActive) {
    return
  }
  emit('help', {
    type: 'action',
    id: action.id,
    element,
  })
}

function buildItemAction(
  element: HTMLElement,
): DraggableActionItem | undefined {
  const actionType = element.dataset.sortliId
  if (!actionType) {
    return
  }
  const action = props.actions.find((v) => v.id === actionType)
  if (!action) {
    return
  }
  return {
    itemType: 'action',
    action,
    actionType,
    itemBundle: action.itemBundle,
    element: () => element,
  }
}
</script>
