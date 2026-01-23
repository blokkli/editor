<template>
  <Sortli id="blokkli-add-list-actions" :build-item="buildItemAction">
    <ActionButton
      v-for="action in actions"
      :key="action.id"
      :action="action"
      :selectable-bundles
    />
  </Sortli>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Sortli } from '#blokkli/editor/components'
import ActionButton from './Action.vue'
import type { DraggableActionItem } from '../types';

defineProps<{
  selectableBundles: string[]
}>()

const { plugins } = useBlokkli()

const actions = computed(() => {
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
