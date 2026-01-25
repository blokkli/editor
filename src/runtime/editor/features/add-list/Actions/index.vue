<template>
  <Sortli id="blokkli-add-list-actions" :build-item="buildItemAction">
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
import { computed, useBlokkli } from '#imports'
import { Sortli } from '#blokkli/editor/components'
import ActionButton from './Action.vue'
import type { AddListHelp, DraggableActionItem } from '../types'
import type { AddAction } from '#blokkli/editor/types/actions'

const props = defineProps<{
  selectableBundles: string[]
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
    id: action.id,
    title: action.title,
    text: action.description ?? '',
    element,
  })
}

function onHelp(action: AddAction, element: HTMLElement) {
  if (!props.helpActive) {
    return
  }
  emit('help', {
    id: action.id,
    title: action.title,
    text: action.description ?? '',
    element,
  })
}

const { plugins } = useBlokkli()

const actions = computed<AddAction[]>(() => {
  return plugins.get('addAction').sort((a, b) => a.weight - b.weight)
})

function buildItemAction(
  element: HTMLElement,
): DraggableActionItem | undefined {
  const actionType = element.dataset.sortliId
  if (!actionType) {
    return
  }
  const action = actions.value.find((v) => v.id === actionType)
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
