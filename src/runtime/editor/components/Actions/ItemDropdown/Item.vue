<template>
  <button
    :data-test="`item-dropdown-action-${action.id}`"
    class="gap-10 group/tooltip grid grid-cols-[20px_1fr] w-full text-mono-300 items-center left-left leading-none disabled:opacity-20 disabled:pointer-events-none hover:text-white hover:bg-mono-800 px-10"
    :class="{
      'hover:bg-orange-normal/10! hover:text-orange-light!':
        action.variant === 'agent',
      'text-base font-semibold py-15': isLarge,
      'text-sm font-medium py-10': !isLarge,
    }"
    :disabled="action.enabled === false"
  >
    <div
      class="flex items-center justify-center shrink-0 col-start-1 row-start-1"
      :class="{
        'text-orange-normal': action.variant === 'agent',
      }"
    >
      <div
        :class="{
          'size-20': isLarge,
          'size-15': !isLarge,
        }"
      >
        <Icon v-if="action.icon" :name="action.icon" class="size-full" />
        <ItemIcon
          v-else-if="action.bundle"
          :bundle="action.bundle"
          class="size-full"
        />
      </div>
    </div>
    <div class="col-start-2 row-start-1">
      <div>{{ action.label }}</div>
    </div>
    <Tooltip
      v-if="action.description"
      :label="action.description"
      placement="center-after"
    />
  </button>
</template>

<script setup lang="ts">
import type { ItemDropdownAction } from '#blokkli/editor/providers/plugin'
import { ItemIcon, Icon, Tooltip } from '#blokkli/editor/components'
import { computed } from '#imports'

const props = defineProps<{ action: ItemDropdownAction }>()

const isLarge = computed<boolean>(() => props.action.variant === 'agent')
</script>
