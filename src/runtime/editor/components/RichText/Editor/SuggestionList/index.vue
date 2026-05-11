<template>
  <div
    class="bk-richtext-suggestion-list absolute z-50 bg-white border border-mono-300 rounded shadow-lg min-w-[180px] overflow-hidden"
  >
    <button
      v-for="(item, idx) in items"
      :key="idx"
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
      <slot name="item" :item="item" />
    </button>
    <div v-if="!items.length" class="px-10 py-5 text-sm text-mono-500 italic">
      No matches
    </div>
  </div>
</template>

<script lang="ts" setup generic="T, P">
import { ref, watch } from '#imports'

const props = defineProps<{
  items: T[]
  command: (payload: P) => void
  getPayload: (item: T) => P
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
    props.command(props.getPayload(item))
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
  name: 'SuggestionList',
}
</script>
