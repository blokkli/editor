<template>
  <button
    ref="buttonEl"
    class="flex gap-8 whitespace-nowrap w-full px-10 text-mono-800 items-center hover:bg-mono-100 min-h-50 group/tooltip relative border-b border-b-mono-200 last:border-b-0 group/toggle"
    :data-test-view-option="id"
    :data-test-active="isActive"
    :class="{ 'bk-is-inactive': !isActive }"
    @click.prevent.stop="toggle"
  >
    <Icon v-if="icon" :name="icon" class="size-20" />
    <div class="font-medium text-base">
      {{ label }}
    </div>
    <div class="ml-auto">
      <FormToggle :model-value="isActive" />
    </div>
    <Tooltip :label="description" placement="center-before">
      <template v-if="keyCode" #shortcut>
        <ShortcutIndicator meta :key-code :label group="ui" @pressed="toggle" />
      </template>
    </Tooltip>
  </button>
</template>

<script setup lang="ts">
import { useBlokkli, useTemplateRef, watch } from '#imports'
import {
  Icon,
  ShortcutIndicator,
  Tooltip,
  FormToggle,
} from '#blokkli/editor/components'
import { defineCommands, defineTourItem } from '#blokkli/editor/composables'
import type { ViewOption } from '#blokkli/editor/providers/plugin'

const props = defineProps<ViewOption>()

const { storage, eventBus, $t } = useBlokkli()

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
  label: (isActive.value
    ? $t('viewOptionDisable', 'Disable "@option"')
    : $t('viewOptionEnable', 'Enable "@option"')
  ).replace('@option', props.label),
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
