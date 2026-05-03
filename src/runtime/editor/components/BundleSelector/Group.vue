<template>
  <div v-show="items.length" class="border-t border-mono-700 py-10">
    <div
      v-if="label"
      class="flex items-center gap-8 text-mono-400 uppercase font-semibold text-xs tracking-wide !leading-none px-15"
    >
      <span>{{ label }}</span>
    </div>
    <div class="grid grid-cols-3">
      <AddListItem
        v-for="item in items"
        :key="item.props.id"
        v-bind="item.props"
        class="px-20 py-10"
        @click.prevent="$emit('select', item)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Item } from './types'
import { AddListItem } from '#blokkli/editor/components'

defineProps<{
  label?: string
  items: Item[]
}>()

defineEmits<{
  (e: 'select', item: Item): void
}>()
</script>
