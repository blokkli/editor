<template>
  <div v-if="shouldRender" class="bk-command-palette-results-group">
    <h2>{{ label }}</h2>
    <div>
      <button
        v-for="item in mapped"
        v-show="item.visible"
        :key="item.id"
        :data-command-id="item.id"
        :data-command-visible="item.visible"
        class="bk-command"
        :class="{ 'bk-is-focused': focusedId === item.id }"
        @mouseenter="$emit('focus', item.id)"
        @click.prevent="$emit('select', item.id)"
      >
        <div class="bk-command-icon">
          <Icon v-if="item.icon" :name="item.icon" />
          <ItemIcon v-else :bundle="item.bundle" />
        </div>
        <Highlight :text="item.label" tag="span" :regex="regex" />
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { Icon, ItemIcon, Highlight } from '#blokkli/components'
import type { Command } from '#blokkli/types'

const props = defineProps<{
  label: string
  commands: Array<Command & { _id: number }>
  visibleIds: number[] | undefined
  regex?: RegExp
  focusedId: string
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'focus', id: string): void
  (e: 'select', id: string): void
}>()

const mapped = computed(() => {
  return props.commands
    .map((v) => {
      return {
        ...v,
        visible:
          props.visibleIds === undefined || props.visibleIds.includes(v._id),
      }
    })
    .sort((a, b) => {
      const indexA = props.visibleIds?.indexOf(a._id) || -1
      const indexB = props.visibleIds?.indexOf(b._id) || -1

      if (indexA === -1 && indexB === -1) {
        return 0
      } else if (indexA === -1) {
        return 1
      } else if (indexB === -1) {
        return -1
      }

      return indexA - indexB
    })
})

const shouldRender = computed(() => mapped.value.some((v) => v.visible))
</script>