<template>
  <Teleport :to="'#bk-toolbar-' + region">
    <button
      ref="el"
      class="bk-toolbar-button group/tooltip"
      :disabled="disabled"
      :class="[
        { 'bk-is-active': active },
        id ? 'bk-is-' + id : undefined,
        $attrs.class,
      ]"
      :style="{ order: weight || 0 }"
      @click.prevent.stop="onClick"
    >
      <slot>
        <Icon v-if="icon" :name="icon" />
      </slot>
      <Tooltip
        :label="title"
        :placement="tooltipPlacement"
        :margin="region === 'before-sidebar'"
      >
        <template v-if="keyCode" #shortcut>
          <ShortcutIndicator
            :meta="meta"
            :shift="shift"
            :key-code="keyCode"
            :label="title"
            :group="shortcutGroup"
            @pressed="onClick"
          />
        </template>
      </Tooltip>
    </button>
  </Teleport>
</template>

<script setup lang="ts">
import { ShortcutIndicator, Icon, Tooltip } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { computed, ref, useBlokkli } from '#imports'
import { defineCommands, defineTourItem } from '#blokkli/editor/composables'
import type { Placement } from '#blokkli/editor/types/ui'

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
    | 'title'
    | 'after-title'
    | 'before-title'
    | 'before-sidebar'
    | 'after-menu'
    | 'before-sidebar-right'
    | 'view-options'
    | 'artboard'

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

const { debug, ui } = useBlokkli()
const logger = debug.createLogger('PluginToolbar')

const emit = defineEmits(['click'])

const el = ref<HTMLButtonElement | null>(null)

async function onClick() {
  if (props.disabled) {
    return
  }

  logger.log(`Click ${props.id}`)

  // Persist any pending option changes before running the action.
  await ui.flushPendingChanges()
  emit('click')
}

const tooltipPlacement = computed<Placement>(() => {
  if (props.region === 'before-sidebar-right') {
    return 'below-before'
  } else if (
    props.region === 'before-sidebar' ||
    props.region === 'artboard' ||
    props.region === 'title'
  ) {
    return 'below-right'
  }

  return 'below-left'
})

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

defineOptions({
  name: 'PluginToolbarButton',
  inheritAttrs: false,
})
</script>
