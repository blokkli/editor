<template>
  <Teleport to="#bk-blokkli-item-actions">
    <button
      v-if="shouldRender"
      v-show="!hidden"
      ref="el"
      :disabled="isDisabled"
      class="group/tooltip flex items-center shrink-0 justify-center relative lg:static z-50 size-50 lg:hover:bg-mono-700 text-mono-300 lg:hover:text-mono-50"
      :class="[
        {
          'bk-is-active': active,
          'bk-is-last': weight === 'last',
          'cursor-not-allowed text-mono-500!': disabled,
        },
        $attrs.class,
      ]"
      :style="weight !== 'last' ? { order: weight || 0 } : undefined"
      @click.prevent.stop="onClick"
    >
      <div class="relative">
        <Icon
          v-if="icon"
          :name="icon"
          class="size-20 lg:size-24 fill-current pointer-events-none"
        />
        <slot name="icon-addon" />
      </div>
      <Tooltip
        :label="title"
        :description
        placement="above-left"
        class="min-w-full"
      >
        <template v-if="keyCode" #shortcut>
          <ShortcutIndicator
            :meta="meta"
            :label="title"
            :key-code="keyCode"
            group="blocks"
            @pressed="onClick"
          />
        </template>
        <template #status>
          <TooltipStatus
            v-if="disabledReason"
            :description="disabledReason"
            :status="disabledReasonSuccess ? 'success' : 'warning'"
          />
        </template>
      </Tooltip>
    </button>
  </Teleport>
  <slot :items="selection.items.value" :uuids="uuids" />
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'

import type { BlokkliIcon } from '#blokkli-build/icons'
import {
  Icon,
  ShortcutIndicator,
  Tooltip,
  TooltipStatus,
} from '#blokkli/editor/components'
import { defineCommands, defineTourItem } from '#blokkli/editor/composables'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'

const { selection, state, ui } = useBlokkli()

const el = ref<HTMLElement | null>(null)

const uuids = computed(() => selection.uuids.value)

const props = withDefaults(
  defineProps<{
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

    description?: string

    /**
     * Whether the action is disabled.
     *
     * When a string is provided, the button is disabled and the string is
     * displayed as the tooltip text explaining why.
     */
    disabled?: boolean | string

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
     * Whether the action should be hidden.
     *
     * Unlike disabled, this completely hides the button via v-show.
     */
    hidden?: boolean

    /**
     * When true, the disabled reason tooltip is rendered in lime (success)
     * instead of the default yellow (warning).
     *
     * Use this when the disabled state is a positive outcome rather than an error.
     */
    disabledReasonSuccess?: boolean

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
  }>(),
  {
    weight: undefined,
    icon: undefined,
    tourText: undefined,
    keyCode: undefined,
    active: undefined,
    disabled: false,
  },
)

const isDisabled = computed(
  () =>
    !!props.disabled || (!props.multiple && selection.items.value.length > 1),
)

const disabledReason = computed(() =>
  typeof props.disabled === 'string' ? props.disabled : null,
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
  if (isDisabled.value || !uuids.value.length || ui.isApproving.value) {
    return
  }

  emit('click', selection.items.value)
}

defineCommands(() => ({
  id: 'plugin:item_action:' + props.id,
  group: 'selection',
  label: props.title,
  icon: props.icon,
  disabled: isDisabled.value || !selection.items.value.length,
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
