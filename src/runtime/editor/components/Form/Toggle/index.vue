<template>
  <label
    class="bk-checkbox-toggle group/tooltip relative flex cursor-pointer h-full leading-none group/toggle"
    :class="{
      'h-full items-center': stretch,
      'cursor-not-allowed!': disabled,
    }"
  >
    <slot />
    <input
      v-if="!hideInput"
      v-model="value"
      type="checkbox"
      data-test="form-toggle-input"
      class="sr-only"
      :disabled
    />
    <div
      class="bk-checkbox-toggle-toggle group-focus-within/toggle:outline outline-accent-950/80 outline-offset-2 relative w-[36px] h-20 rounded-full shrink-0 mr-5 last:mr-0"
      :class="{
        'mt-2': !stretch,
        'bg-mono-200!': disabled,
        'bg-mono-500 group-hover/toggle:bg-mono-400': isDark,
        'bg-mono-400 group-hover/toggle:bg-mono-500': !isDark,
        'bg-accent-600! group-hover/toggle:bg-accent-500!': value && isDark,
        'bg-accent-600! group-hover/toggle:bg-accent-700!': value && !isDark,
      }"
    >
      <div
        class="absolute top-2 left-2 bg-white rounded-full size-[16px]"
        :class="{
          'translate-x-full': value,
        }"
      />
    </div>
    <div
      v-if="label || description"
      class="bk-checkbox-toggle-label inline-block text-base"
    >
      <div
        v-if="label"
        class="bk-checkbox-toggle-label-label font-semibold"
        :class="{
          'text-mono-200 group-hover/toggle:text-white': isDark,
          'text-mono-700 group-hover/toggle:text-mono-950': !isDark,
        }"
      >
        {{ label }}
      </div>
      <div
        v-if="description"
        class="text-sm text-pretty"
        :class="{
          'text-mono-400': isDark,
          'text-mono-500': !isDark,
          'text-mono-300!': disabled,
        }"
      >
        {{ description }}
      </div>
      <div v-if="disabledReason" class="bk-form-disabled-reason mt-8">
        {{ disabledReason }}
      </div>
    </div>
    <Tooltip
      v-if="tooltip"
      :label="tooltip"
      class="max-w-full whitespace-normal"
    />
  </label>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import Tooltip from '#blokkli/editor/components/Tooltip/index.vue'

const props = withDefaults(
  defineProps<{
    label?: string
    description?: string
    tooltip?: string
    disabled?: boolean
    disabledReason?: string | null
    colorScheme?: 'light' | 'dark'
    stretch?: boolean
    hideInput?: boolean
  }>(),
  {
    label: undefined,
    description: undefined,
    tooltip: undefined,
    disabled: false,
    disabledReason: null,
    colorScheme: 'light',
    stretch: false,
  },
)

const isDark = computed<boolean>(() => props.colorScheme === 'dark')

const value = defineModel<boolean>()
</script>
