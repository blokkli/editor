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
        <Highlight :text="item.label" tag="span" :positions="item.positions" />
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
  visibleIds: { id: number; positions: number[] }[] | undefined
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
      const found = props.visibleIds?.find((w) => w.id === v._id)
      return {
        ...v,
        visible: props.visibleIds === undefined || !!found,
        positions: found?.positions,
      }
    })
    .sort((a, b) => {
      const indexA = props.visibleIds?.findIndex((w) => w.id === a._id) || -1
      const indexB = props.visibleIds?.findIndex((w) => w.id === b._id) || -1
      return indexA - indexB
    })
})

const shouldRender = computed(() => mapped.value.some((v) => v.visible))
</script>
