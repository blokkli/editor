<template>
  <Teleport to="#bk-toolbar-view-options">
    <button
      v-if="!ui.isMobile.value"
      ref="button"
      class="bk-toolbar-button"
      :class="{ 'bk-is-inactive': !isActive }"
      :style="{ order: weight || 0 }"
      @click.prevent.stop="onClick"
    >
      <slot name="icon">
        <Icon v-if="icon" :name="icon" />
      </slot>
      <div class="bk-tooltip">
        <span>{{ title }}</span>

        <ShortcutIndicator
          v-if="keyCode"
          meta
          :key-code="keyCode"
          :label="label"
          group="ui"
          @pressed="onClick"
        />
      </div>
    </button>
  </Teleport>

  <slot :is-active="isActive && !ui.isMobile.value" />
</template>

<script setup lang="ts">
import { useBlokkli, computed, ref, watch } from '#imports'
import { ShortcutIndicator, Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { defineCommands, defineTourItem } from '#blokkli/editor/composables'

const { storage, ui, eventBus, debug } = useBlokkli()

const props = defineProps<{
  /**
   * Unique identifier for this view option.
   *
   * Used for storage key and event tracking.
   */
  id: string

  /**
   * The label used in commands and tour.
   */
  label: string

  /**
   * The tooltip text when the option is OFF.
   *
   * Should describe what happens when turned on.
   * @example 'Show grid'
   */
  titleOn: string

  /**
   * The tooltip text when the option is ON.
   *
   * Should describe what happens when turned off.
   * @example 'Hide grid'
   */
  titleOff: string

  /**
   * Whether the view option is only available in edit mode.
   *
   * If true, the option is hidden in preview mode.
   */
  editOnly?: boolean

  /**
   * The key code to use for the keyboard shortcut.
   *
   * Automatically includes Meta modifier.
   * @example 'g' for Cmd+G / Ctrl+G
   */
  keyCode?: string

  /**
   * The icon displayed in the button.
   */
  icon?: BlokkliIcon

  /**
   * Optional text for the interactive tour.
   *
   * If provided, this option will be included in the editor tour.
   */
  tourText?: string

  /**
   * Two-way binding for the active state.
   *
   * Can be used with v-model to track the option state.
   */
  modelValue?: boolean

  /**
   * The weight, used for positioning the button.
   *
   * Lower weights appear first.
   */
  weight?: number | string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', data: boolean): void
}>()

const logger = debug.createLogger('PluginViewOption')
const storageKey = 'view_option_' + props.id
const button = ref<HTMLElement | null>(null)

const isActiveStorage = storage.use(storageKey, false, true)

const isActive = computed({
  get() {
    return isActiveStorage.value
  },
  set(v: boolean) {
    isActiveStorage.value = v
    emit('update:modelValue', v)
  },
})

watch(isActive, () => {
  eventBus.emit('view-option:toggle', { id: props.id })
})

emit('update:modelValue', isActiveStorage.value)

const title = computed(() => (isActive.value ? props.titleOff : props.titleOn))

const onClick = () => {
  isActive.value = !isActive.value
  logger.log('Toggle ' + props.id, isActive.value)
}

defineCommands(() => {
  return {
    id: 'plugin:view_option:' + props.id,
    label: title.value,
    icon: props.icon,
    group: 'ui',
    callback: () => (isActive.value = !isActive.value),
  }
})

defineTourItem(() => {
  if (!props.tourText) {
    return
  }
  return {
    id: 'plugin:view_option:' + props.id,
    title: props.label,
    text: props.tourText,
    element: () => button.value,
  }
})
</script>

<script lang="ts">
export default {
  name: 'PluginViewOption',
}
</script>
