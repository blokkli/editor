<template>
  <label
    class="flex items-start gap-5 cursor-pointer p-10 border border-mono-200 min-w-0 hover:bg-mono-50 hover:border-mono-400 rounded"
    :class="{
      'border-accent-600! outline-4 outline-accent-200 bg-accent-50!':
        isSelected,
      'opacity-50 cursor-not-allowed! hover:bg-transparent! hover:border-mono-200!':
        disabled,
    }"
  >
    <span class="bk-radio">
      <input v-model="selected" type="radio" :value :name :disabled :required />
      <span />
    </span>
    <div class="flex-1 min-w-0">
      <div class="truncate font-semibold text-base">
        <slot name="title">{{ title }}</slot>
      </div>
      <div
        v-if="$slots.description || description"
        class="text-sm text-mono-500 mt-2"
      >
        <slot name="description">{{ description }}</slot>
      </div>
      <slot />
    </div>
  </label>
</template>

<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{
  value: string
  name: string
  title: string
  description?: string
  disabled?: boolean
  required?: boolean
}>()

const selected = defineModel<string>()

const isSelected = computed(() => selected.value === props.value)
</script>
