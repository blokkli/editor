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
import type { DraggableActionItem } from '#blokkli/types'
import { Sortli } from '#blokkli/components'
import ActionButton from './Action.vue'

defineProps<{
  selectableBundles: string[]
}>()

const { plugins } = useBlokkli()

const actions = computed(() => {
  return plugins.get('addAction')
})

function buildItemAction(
  element: HTMLElement,
): DraggableActionItem | undefined {
  const actionType = element.dataset.sortliId
  if (!actionType) {
    return
  }
  const itemBundle = element.dataset.itemBundle
  const action = actions.value.find((v) => v.id === actionType)
  if (!action) {
    return
  }
  return {
    itemType: 'action',
    action,
    actionType,
    itemBundle,
    element: () => element,
  }
}
</script>
