<template>
  <Teleport to="#bk-blokkli-item-actions">
    <button
      v-if="shouldRender"
      ref="el"
      :disabled="isDisabled"
      class="bk-item-action"
      :class="[
        { 'bk-is-active': active, 'bk-is-last': weight === 'last' },
        $attrs.class,
      ]"
      :style="weight !== 'last' ? { order: weight || 0 } : undefined"
      @click.prevent.stop="onClick"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" class="bk-item-action-icon" />
      </slot>
      <div class="bk-tooltip">
        <span>{{ title }}</span>
        <ShortcutIndicator
          v-if="keyCode"
          :meta="meta"
          :label="title"
          :key-code="keyCode"
          group="blocks"
          @pressed="onClick"
        />
      </div>
    </button>
  </Teleport>
  <slot :items="selection.items.value" :uuids="uuids" />
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'

import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon, ShortcutIndicator } from '#blokkli/components'
import type { RenderedFieldListItem } from '#blokkli/types'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import defineTourItem from '#blokkli/helpers/composables/defineTourItem'

const { selection, state } = useBlokkli()

const el = ref<HTMLElement | null>(null)

const uuids = computed(() => selection.uuids.value)

const props = defineProps<{
  /**
   * Unique identifier for this item action.
   */
  id: string

  /**
   * The title of the action.
   *
   * Displayed in the tooltip and keyboard shortcut hints.
   */
  title: string

  /**
   * Whether the action is disabled.
   */
  disabled?: boolean

  /**
   * Whether the button should be displayed in an active state.
   *
   * Useful when the action opens a dropdown or dialog.
   */
  active?: boolean

  /**
   * The key code to use for the keyboard shortcut.
   *
   * @example 'c' for the "c" key
   */
  keyCode?: string

  /**
   * Whether the shortcut needs the meta modifier key.
   *
   * On Mac this is Cmd, on Windows/Linux this is Ctrl.
   */
  meta?: boolean

  /**
   * Whether the action supports multiple items.
   *
   * If false, the action is disabled when more than one item is selected.
   */
  multiple?: boolean

  /**
   * Whether the action is only available in edit mode.
   *
   * If true, the action is hidden in preview mode.
   */
  editOnly?: boolean

  /**
   * The weight, used for positioning the button.
   *
   * Lower weights appear first. Use 'last' to always position at the end.
   */
  weight?: number | string | 'last'

  /**
   * Optional icon to display in the button.
   */
  icon?: BlokkliIcon

  /**
   * Optional text for the interactive tour.
   *
   * If provided, this action will be included in the editor tour.
   */
  tourText?: string
}>()

const isDisabled = computed(
  () => props.disabled || (!props.multiple && selection.items.value.length > 1),
)

const shouldRender = computed(() => {
  if (props.editOnly) {
    return state.editMode.value === 'editing'
  }

  return true
})

const emit = defineEmits<{
  (e: 'click', items: RenderedFieldListItem[]): void
}>()

const onClick = () => {
  if (isDisabled.value || !uuids.value.length) {
    return
  }

  emit('click', selection.items.value)
}

defineCommands(() => ({
  id: 'plugin:item_action:' + props.id,
  group: 'selection',
  label: props.title,
  icon: props.icon,
  disabled: props.disabled || !selection.items.value.length,
  callback: onClick,
}))

defineTourItem(() => {
  if (!props.tourText) {
    return
  }

  return {
    id: 'plugin:item_action:' + props.id,
    title: props.title,
    text: props.tourText,
    element: () => el.value,
  }
})

defineOptions({
  name: 'PluginItemAction',
  inheritAttrs: false,
})
</script>
