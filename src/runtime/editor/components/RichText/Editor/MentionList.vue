<template>
  <div
    class="bk-richtext-mention-list absolute z-50 bg-white border border-mono-300 rounded shadow-lg py-3 min-w-[180px]"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <button
      v-for="(item, idx) in items"
      :key="item.id"
      type="button"
      class="w-full text-left px-10 py-5 text-sm flex items-center gap-8"
      :class="
        idx === selectedIndex
          ? 'bg-accent-50 text-accent-900'
          : 'text-mono-800 hover:bg-mono-50'
      "
      @click="$emit('pick', idx)"
      @mouseenter="selectedIndex = idx"
    >
      <span class="font-medium">{{ item.label }}</span>
    </button>
    <div v-if="!items.length" class="px-10 py-5 text-sm text-mono-500 italic">
      No matches
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from '#imports'

export type MentionItem = { id: string; label: string }

const props = defineProps<{
  items: MentionItem[]
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  pick: [index: number]
}>()

const selectedIndex = ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  },
)

function move(delta: number) {
  if (!props.items.length) {
    return
  }
  const len = props.items.length
  selectedIndex.value = (selectedIndex.value + delta + len) % len
}

function onKeyDown(event: KeyboardEvent): boolean {
  if (event.key === 'ArrowDown') {
    move(1)
    return true
  }
  if (event.key === 'ArrowUp') {
    move(-1)
    return true
  }
  if (event.key === 'Enter' || event.key === 'Tab') {
    if (props.items.length) {
      emit('pick', selectedIndex.value)
    }
    return true
  }
  return false
}

defineExpose({ onKeyDown })
</script>

<script lang="ts">
export default {
  name: 'MentionList',
}
</script>
