<template>
  <div
    id="bk-blokkli-item-actions-dropdown"
    class="bk-blokkli-item-actions-type-dropdown"
  >
    <div
      v-for="group in groups"
      :key="group.name"
      :class="'bk-is-' + group.name"
    >
      <ol>
        <li v-for="action in group.actions" :key="action.id">
          <button
            class="bk-blokkli-item-actions-type-dropdown-button"
            :class="'bk-is-variant-' + action.variant || 'default'"
            :disabled="action.enabled === false"
            @click.prevent="onActionClick(action)"
          >
            <div class="bk-blokkli-item-actions-type-dropdown-icon">
              <Icon v-if="action.icon" :name="action.icon" />
              <ItemIcon v-else-if="action.bundle" :bundle="action.bundle" />
            </div>
            <div>
              <div>{{ action.label }}</div>
            </div>
            <div v-if="action.description" class="bk-tooltip">
              {{ action.description }}
            </div>
          </button>
        </li>
      </ol>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { ItemIcon, Icon } from '#blokkli/editor/components'
import type { ItemDropdownAction } from '#blokkli/editor/providers/plugin'

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
