<template>
  <button
    ref="buttonEl"
    class="bk-command"
    :class="{ 'bk-is-focused': isFocused }"
    @mouseenter="$emit('focus', index)"
    @click.prevent="$emit('select', item.id)"
  >
    <div class="bk-command-icon">
      <Icon v-if="item.icon" :name="item.icon" />
      <ItemIcon v-else :bundle="item.bundle" />
    </div>
    <Highlight :text="item.label" tag="span" :positions="item.positions" />
    <div class="bk-command-group">{{ getGroupLabel(item.group) }}</div>
  </button>
</template>

<script lang="ts" setup>
import { watch, useBlokkli, useTemplateRef } from '#imports'
import { Icon, ItemIcon, Highlight } from '#blokkli/components'
import type { Command, CommandGroup } from '#blokkli/types'

export type MappedCommandItem = Command & {
  positions?: number[]
  score?: number
  visible?: boolean
}

const props = defineProps<{
  item: MappedCommandItem
  index: number
  isFocused: boolean
}>()

defineEmits<{
  (e: 'focus', index: number): void
  (e: 'select', id: string): void
}>()

const { $t } = useBlokkli()

const buttonEl = useTemplateRef('buttonEl')

// Scroll into view when focused
watch(
  () => props.isFocused,
  (focused) => {
    if (focused && buttonEl.value) {
      buttonEl.value.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  },
)

const getGroupLabel = (id?: CommandGroup): string => {
  if (id === 'ui') {
    return $t('commandGroup.ui', 'Interface')
  } else if (id === 'add') {
    return $t('commandGroup.add', 'Add new')
  } else if (id === 'action') {
    return $t('commandGroup.action', 'Actions')
  } else if (id === 'selection') {
    return $t('commandGroup.selection', 'Selection')
  }

  return $t('commandGroup.misc', 'Miscellaneous')
}
</script>
