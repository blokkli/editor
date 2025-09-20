<template>
  <div v-if="shouldRender" class="bk-command-palette-results-list">
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
        <div class="bk-command-group">{{ getGroupLabel(item.group) }}</div>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon, ItemIcon, Highlight } from '#blokkli/components'
import type { Command, CommandGroup } from '#blokkli/types'

const props = defineProps<{
  commands: Array<Command & { _id: number }>
  visibleIds: { id: number; positions: number[] }[] | undefined
  focusedId: string
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'focus' | 'select', id: string): void
}>()

const { $t } = useBlokkli()

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

const shouldRender = computed(() => mapped.value.some((v) => v.visible))
</script>
