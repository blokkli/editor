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
  <slot :items="selection.blocks.value" :uuids="uuids" />
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'

import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon, ShortcutIndicator } from '#blokkli/components'
import type { DraggableExistingBlock } from '#blokkli/types'
import defineCommands from '#blokkli/helpers/composables/defineCommands'
import defineTourItem from '#blokkli/helpers/composables/defineTourItem'

const { selection, state } = useBlokkli()

const el = ref<HTMLElement | null>(null)

const uuids = computed(() => selection.uuids.value)

const props = defineProps<{
  id: string
  /**
   * The title of the action.
   */
  title: string

  /**
   * Whether the action is disabled.
   */
  disabled?: boolean

  /**
   * Whether the button should be displayed in an active state (e.g. when it's a dropdown).
   */
  active?: boolean

  /**
   * The key code to use for the shortcut.
   */
  keyCode?: string

  /**
   * Wheter the shortcut needs the meta modifier key.
   */
  meta?: boolean

  /**
   * Whether the action supports multiple items.
   */
  multiple?: boolean

  /**
   * Whether the action is only available in edit mode.
   */
  editOnly?: boolean

  /**
   * The weight, used for positioning the button.
   */
  weight?: number | string | 'last'

  icon?: BlokkliIcon

  tourText?: string
}>()

const isDisabled = computed(
  () =>
    props.disabled || (!props.multiple && selection.blocks.value.length > 1),
)

const shouldRender = computed(() => {
  if (props.editOnly) {
    return state.editMode.value === 'editing'
  }

  return true
})

const emit = defineEmits<{
  (e: 'click', items: DraggableExistingBlock[]): void
}>()

const onClick = () => {
  if (isDisabled.value || !uuids.value.length) {
    return
  }

  emit('click', selection.blocks.value)
}

defineCommands(() => ({
  id: 'plugin:item_action:' + props.id,
  group: 'selection',
  label: props.title,
  icon: props.icon,
  disabled: props.disabled || !selection.blocks.value.length,
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
