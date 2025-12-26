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
import { ShortcutIndicator, Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { ref, useBlokkli } from '#imports'
import { defineCommands, defineTourItem } from '#blokkli/editor/composables'

const props = defineProps<{
  /**
   * Unique identifier for this toolbar button.
   */
  id: string

  /**
   * The title displayed in the tooltip.
   */
  title: string

  /**
   * Which toolbar region to render the button in.
   *
   * Different regions appear in different locations of the toolbar.
   */
  region:
    | 'after-title'
    | 'before-title'
    | 'before-sidebar'
    | 'after-menu'
    | 'before-sidebar-right'
    | 'view-options'

  /**
   * Whether the button is only available in edit mode.
   *
   * If true, the button is hidden in preview mode.
   */
  editOnly?: boolean

  /**
   * Whether the button is disabled.
   */
  disabled?: boolean

  /**
   * Whether the button should be displayed in an active state.
   *
   * Useful when the button opens a dropdown or toggles a feature.
   */
  active?: boolean

  /**
   * Whether the keyboard shortcut needs the meta modifier key.
   *
   * On Mac this is Cmd, on Windows/Linux this is Ctrl.
   */
  meta?: boolean

  /**
   * Whether the keyboard shortcut needs the shift modifier key.
   */
  shift?: boolean

  /**
   * The key code to use for the keyboard shortcut.
   *
   * @example 'h' for the "h" key
   */
  keyCode?: string

  /**
   * Optional icon to display in the button.
   */
  icon?: BlokkliIcon

  /**
   * The keyboard shortcut group.
   *
   * Used for organizing shortcuts in the shortcuts panel.
   */
  shortcutGroup?: string

  /**
   * Optional text for the interactive tour.
   *
   * If provided, this button will be included in the editor tour.
   */
  tourText?: string

  /**
   * The weight, used for positioning the button.
   *
   * Lower weights appear first.
   */
  weight?: number | string

  /**
   * Whether to skip registering this button as a command.
   *
   * Useful when you want the button UI without command palette integration.
   */
  noCommand?: boolean
}>()

const { debug } = useBlokkli()
const logger = debug.createLogger('PluginToolbar')

const emit = defineEmits(['click'])

const el = ref<HTMLButtonElement | null>(null)

function onClick() {
  if (props.disabled) {
    return
  }

  logger.log(`Click ${props.id}`)

  emit('click')
}

defineCommands(() => {
  if (props.noCommand) {
    return
  }
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
