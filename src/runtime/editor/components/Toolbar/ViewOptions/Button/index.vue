<template>
  <button
    ref="buttonEl"
    class="bk-toolbar-button group/tooltip"
    :data-test-view-option="id"
    :data-test-active="isActive"
    :class="{ 'bk-is-inactive': !isActive }"
    :style="{ order: weight ?? 0 }"
    @click.prevent.stop="toggle"
  >
    <Icon v-if="icon" :name="icon" />
    <Tooltip
      :label="isActive ? titleOff : titleOn"
      class="w-full"
      placement="below-left"
    >
      <ShortcutIndicator
        v-if="keyCode"
        meta
        :key-code
        :label
        group="ui"
        @pressed="toggle"
      />
    </Tooltip>
  </button>
</template>

<script setup lang="ts">
import { useBlokkli, useTemplateRef, watch } from '#imports'
import { Icon, Tooltip, ShortcutIndicator } from '#blokkli/editor/components'
import { defineCommands, defineTourItem } from '#blokkli/editor/composables'
import type { ViewOption } from '../../../../providers/plugin'

const props = defineProps<ViewOption>()

const { storage, eventBus } = useBlokkli()

const buttonEl = useTemplateRef('buttonEl')
const isActive = storage.use('view_option_' + props.id, false, true)

function toggle() {
  isActive.value = !isActive.value
}

watch(isActive, () => {
  eventBus.emit('view-option:toggle', { id: props.id })
})

defineCommands(() => ({
  id: 'plugin:view_option:' + props.id,
  label: isActive.value ? props.titleOff : props.titleOn,
  icon: props.icon,
  group: 'ui',
  callback: toggle,
}))

defineTourItem(() => {
  if (!props.tourText) {
    return
  }
  return {
    id: 'plugin:view_option:' + props.id,
    title: props.label,
    text: props.tourText,
    element: () => buttonEl.value,
  }
})
</script>

<script lang="ts">
export default {
  name: 'ToolbarViewOptionsButton',
}
</script>
