<template>
  <div class="w-full bk-panel-item">
    <div
      class="bg-white w-full grid grid-cols-[1fr_auto] group/panel-item"
      :class="{
        'hover:bg-mono-100': renderAsButton,
        'bg-white! pointer-events-none! text-mono-300': disabled,
        'bg-mono-100! text-mono-500 hover:bg-mono-200!': muted,
        'bg-white!': active,
      }"
    >
      <Component
        :is="renderAsButton ? 'button' : 'div'"
        class="p-panel-gap flex gap-8 w-full col-start-1 -col-end-1 row-start-1"
        type="button"
        @click.prevent="$emit('click')"
      >
        <div
          v-if="icon"
          class="size-[36px] p-5 shrink-0 rounded"
          :class="[
            namedTheme && typeof props.theme !== 'object'
              ? [
                  'bk-scheme-' + namedTheme,
                  'bg-scheme-normal',
                  'text-scheme-text',
                ]
              : undefined,
            {
              'opacity-30': disabled || muted,
            },
          ]"
          :style="typeof theme === 'object' ? theme : undefined"
        >
          <Icon :name="icon" />
        </div>
        <div>
          <div class="text-sm font-semibold">{{ title }}</div>
          <div v-if="description" class="text-xs">{{ description }}</div>
        </div>
      </Component>
      <div
        v-if="$slots.actions"
        class="row-start-1 col-start-2 flex items-center pr-15 relative opacity-50 group-hover/panel-item:opacity-100"
      >
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
import type { BlokkliIcon } from '#blokkli-build/icons'
import Icon from '#blokkli/editor/components/Icon/index.vue'
import { computed, useSlots } from '#imports'
import type { ThemeColorName } from './../../../../../global/types/theme'

const props = defineProps<{
  /**
   * The title of the item.
   */
  title: string

  /**
   * The optional description.
   */
  description?: string

  /**
   * The icon.
   */
  icon?: BlokkliIcon

  /**
   * Use a predefined theme color by name or provide the colors.
   */
  theme?: ThemeColorName | { background: string; color: string }

  /**
   * If the item is disabled.
   */
  disabled?: boolean

  /**
   * If true, the item is displayed as muted/inactive, without being disabled.
   */
  muted?: boolean

  /**
   * If true, the item is displayed in an active state (e.g. opened).
   */
  active?: boolean

  /**
   * Whether to render a button. Automatically set to true if a default slot is provided.
   */
  isButton?: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()

const slots = useSlots()

const renderAsButton = computed<boolean>(
  () => !!slots.default || !!props.isButton,
)

const namedTheme = computed<ThemeColorName>(() => {
  if (typeof props.theme === 'string') {
    return props.theme
  }

  return 'accent'
})
</script>
