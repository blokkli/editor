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
        <span>{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { Icon, ItemIcon } from '#blokkli/components'
import type { Command } from '#blokkli/types'

const props = defineProps<{
  label: string
  commands: Command[]
  text: string
  focusedId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'focus', id: string): void
  (e: 'select', id: string): void
}>()

const mapped = computed(() => {
  return props.commands.map((v) => {
    return {
      ...v,
      visible: v.label.toLowerCase().includes(props.text),
    }
  })
})

const shouldRender = computed(() => mapped.value.some((v) => v.visible))

const onClick = (command: Command) => {
  command.callback()
  emit('close')
}
</script>
