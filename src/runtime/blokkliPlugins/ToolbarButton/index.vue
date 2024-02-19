<template>
  <Teleport :to="'#bk-toolbar-' + region">
    <button
      ref="el"
      class="bk-toolbar-button"
      :disabled="disabled"
      :class="[{ 'is-active': active }, id ? 'bk-is-' + id : undefined]"
      :style="{ order: weight || 0 }"
      @click.prevent.stop="onClick"
    >
      <slot>
        <Icon v-if="icon" :name="icon" />
      </slot>
      <div class="bk-tooltip">
        <span>{{ title }}</span>
        <ShortcutIndicator
          v-if="keyCode"
          :meta="meta"
          :shift="shift"
          :key-code="keyCode"
          :label="title"
          :group="shortcutGroup"
          @pressed="onClick"
        />
      </div>
    </button>
  </Teleport>
</template>

<script setup lang="ts">
import { ShortcutIndicator } from '#blokkli/components'
import type { BlokkliIcon } from '#blokkli/icons'
import { Icon } from '#blokkli/components'
import { ref } from '#imports'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import defineTourItem from '#blokkli/helpers/composables/defineTourItem'

const props = defineProps<{
  id: string
  title: string
  region:
    | 'after-title'
    | 'before-title'
    | 'before-sidebar'
    | 'after-menu'
    | 'before-sidebar-right'
    | 'view-options'
  editOnly?: boolean
  disabled?: boolean
  active?: boolean
  meta?: boolean
  shift?: boolean
  keyCode?: string
  icon?: BlokkliIcon
  shortcutGroup?: string
  tourText?: string

  /**
   * The weight, used for positioning the button.
   */
  weight?: number | string
}>()

const emit = defineEmits(['click'])

const el = ref<HTMLButtonElement | null>(null)

function onClick() {
  if (props.disabled) {
    return
  }

  emit('click')
}

defineCommands(() => {
  return {
    id: 'plugin:toolbar_button:' + props.id,
    label: props.title,
    group: 'ui',
    icon: props.icon,
    disabled: props.disabled,
    callback: () => emit('click'),
  }
})

defineTourItem(() => {
  if (!props.tourText) {
    return
  }

  return {
    id: 'plugin:toolbar-button:' + props.id,
    title: props.title,
    text: props.tourText,
    element: () => el.value,
  }
})
</script>

<script lang="ts">
export default {
  name: 'PluginToolbarButton',
}
</script>
