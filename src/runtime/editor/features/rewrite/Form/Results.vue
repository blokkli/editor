<template>
  <div
    v-if="items.length"
    class="bk-rewrite-results"
    @mouseleave="onMouseLeave"
  >
    <label
      v-for="item in items"
      :key="item.key"
      class="bk-rewrite-result-item bk-checkbox"
      :class="{ 'bk-is-rejected': !item.accepted }"
      @mouseenter="onMouseEnter(item.element)"
    >
      <input
        type="checkbox"
        :checked="item.accepted"
        @change="$emit('toggle', item.key)"
      />
      <span />
      <div class="bk-rewrite-result-text">{{ item.displayText }}</div>
    </label>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'

export type ResultItem = {
  key: string
  uuid: string
  fieldName: string
  displayText: string
  accepted: boolean
  element: HTMLElement | null
}

const { eventBus } = useBlokkli()

defineProps<{
  items: ResultItem[]
}>()

defineEmits<{
  (e: 'toggle', key: string): void
}>()

function onMouseEnter(element: HTMLElement | null) {
  if (!element) {
    return
  }

  eventBus.emit('highlight', element)
}

function onMouseLeave() {
  eventBus.emit('highlight', null)
}
</script>
