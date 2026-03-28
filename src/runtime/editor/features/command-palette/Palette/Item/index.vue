<template>
  <button
    ref="buttonEl"
    class="bk-command flex text-mono-300 pl-[12px] pr-10 w-full text-left gap-10 items-center border border-transparent"
    :class="isFocused ? 'bg-mono-800 border-mono-700 text-white' : ''"
    @mouseenter="$emit('focus', index)"
    @click.prevent="$emit('select', item.id)"
  >
    <div
      class="bk-command-icon w-20 h-20"
      :class="isFocused ? 'text-mono-100' : 'text-mono-500'"
    >
      <Icon v-if="item.icon" :name="item.icon" />
      <ItemIcon v-else :bundle="item.bundle" />
    </div>
    <Highlight :text="item.label" tag="span" :positions="item.positions" />
    <div class="ml-auto uppercase text-xs font-semibold text-mono-500">
      {{ getGroupLabel(item.group) }}
    </div>
  </button>
</template>

<script lang="ts" setup>
import { watch, useBlokkli, useTemplateRef } from '#imports'
import { Icon, ItemIcon, Highlight } from '#blokkli/editor/components'
import type { Command, CommandGroup } from '../../types'

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

<style lang="postcss">
.bk .bk-command {
  height: var(--bk-command-palette-item-height);

  .bk-highlight em {
    @apply bg-yellow-normal/20 outline outline-[1px] outline-yellow-normal/50 font-semibold text-white;
  }
}

.bk-command-icon {
  .bk-blokkli-item-icon,
  .bk-icon {
    @apply w-full h-full;
    svg {
      @apply w-full h-full fill-current;
    }
  }
}
</style>
