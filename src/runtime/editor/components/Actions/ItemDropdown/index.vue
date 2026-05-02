<template>
  <div>
    <div
      v-for="group in groups"
      :key="group.name"
      class="border-b border-b-mono-600"
    >
      <ol>
        <li v-for="action in group.actions" :key="action.id">
          <Item :action @click.prevent="onActionClick(action)" />
        </li>
      </ol>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import type { ItemDropdownAction } from '#blokkli/editor/providers/plugin'
import Item from './Item.vue'

const emit = defineEmits<{
  close: []
}>()

const { plugins } = useBlokkli()

type ActionGroup = {
  name: string
  weight: number
  actions: ItemDropdownAction[]
}

function getGroupedActions(): ActionGroup[] {
  const actions = plugins.get('itemDropdownAction')

  // Group actions by their group property
  const groups = new Map<string, ActionGroup>()

  for (const action of actions) {
    const groupName = action.group
    if (!groups.has(groupName)) {
      groups.set(groupName, {
        name: groupName,
        weight: action.weight ?? 100,
        actions: [],
      })
    }
    groups.get(groupName)!.actions.push(action)
  }

  // Sort groups by weight
  return Array.from(groups.values()).sort((a, b) => a.weight - b.weight)
}

const groups = getGroupedActions()

function onActionClick(action: ItemDropdownAction) {
  if (action.enabled === false) {
    return
  }
  action.callback()
  emit('close')
}
</script>

<script lang="ts">
export default {
  name: 'EditActionsItemDropdown',
}
</script>
