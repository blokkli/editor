<template>
  <Teleport to="#bk-blokkli-item-actions">
    <button
      :disabled="isDisabled"
      :class="{ 'bk-is-active': active, 'bk-is-last': weight === 'last' }"
      :style="weight !== 'last' ? { order: weight || 0 } : undefined"
      @click.prevent.stop="onClick"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" />
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
  <Teleport to="#bk-blokkli-item-actions-after">
    <slot :items="selection.blocks.value" :uuids="uuids" />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

import type { BlokkliIcon } from '#blokkli/icons'
import { Icon } from '#blokkli/components'
import type { Command, DraggableExistingBlock } from '#blokkli/types'
import { ShortcutIndicator } from '#blokkli/components'

const { selection, commands } = useBlokkli()

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
   * The weight, used for positioning the button.
   */
  weight?: number | string | 'last'

  icon?: BlokkliIcon
}>()

const isDisabled = computed(
  () =>
    props.disabled || (!props.multiple && selection.blocks.value.length > 1),
)

const emit = defineEmits<{
  (e: 'click', items: DraggableExistingBlock[]): void
}>()

const onClick = () => {
  if (isDisabled.value || !uuids.value.length) {
    return
  }

  emit('click', selection.blocks.value)
}

const commandProvider = (): Command => {
  return {
    id: 'plugin:item_action:' + props.id,
    group: 'selection',
    label: props.title,
    icon: props.icon,
    disabled: props.disabled,
    callback: onClick,
  }
}

onMounted(() => commands.add(commandProvider))
onBeforeUnmount(() => commands.remove(commandProvider))
</script>

<script lang="ts">
export default {
  name: 'PluginItemAction',
}
</script>
