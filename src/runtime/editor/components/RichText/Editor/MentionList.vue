<template>
  <div
    class="bk-richtext-mention-list absolute z-50 bg-white border border-mono-300 rounded shadow-lg py-3 min-w-[180px]"
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
      @click="selectItem(idx)"
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
  command: (payload: { id: string; label: string }) => void
}>()

const selectedIndex = ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0
  },
)

function selectItem(index: number) {
  const item = props.items[index]
  if (item) {
    props.command({ id: item.id, label: item.label })
  }
}

function onKeyDown({ event }: { event: KeyboardEvent }): boolean {
  if (!props.items.length) {
    return false
  }
  if (event.key === 'ArrowUp') {
    selectedIndex.value =
      (selectedIndex.value + props.items.length - 1) % props.items.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    return true
  }
  if (event.key === 'Enter' || event.key === 'Tab') {
    selectItem(selectedIndex.value)
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
