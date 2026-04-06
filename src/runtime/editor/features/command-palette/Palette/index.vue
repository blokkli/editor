<template>
  <SearchOverlay
    v-slot="{ focusedIndex, onMouseEnter }"
    v-model:text="text"
    :title="$t('commandPaletteTitle', 'Command Palette')"
    :total-items="visibleCommands.length"
    :placeholder="$t('commandPalette.inputPlaceholder', 'Search commands...')"
    @select="onSelectByIndex"
    @close="emit('close')"
  >
    <Item
      v-for="(item, i) in visibleCommands"
      :key="item.id"
      :item="item"
      :index="i"
      :is-focused="focusedIndex === i"
      @focus="onMouseEnter"
      @select="onSelect"
    />
  </SearchOverlay>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli, watch } from '#imports'
import { SearchOverlay } from '#blokkli/editor/components'
import { Fzf } from 'fzf'
import Item, { type MappedCommandItem } from './Item/index.vue'
import type { Command } from '../types'

const emit = defineEmits(['close'])

const { commands, $t, selection, plugins, storage } = useBlokkli()

/**
 * Keep track how often a command was used.
 */
const frequency = storage.use<Record<string, number>>(
  'commandPaletteFrequency',
  {},
)

function incrementFrequency(id: string) {
  const currentCount = frequency.value[id] ?? 0
  frequency.value = {
    ...frequency.value,
    [id]: currentCount + 1,
  }
}

const text = ref('')

const items = computed<Array<Command & { _id: number }>>(() => {
  return [
    ...commands.getCommands(),
    ...plugins.get('menuButton').map<Command>((plugin) => {
      return {
        id: 'menu-button:' + plugin.id,
        label: plugin.title,
        group: 'action',
        icon: plugin.icon,
        disabled: plugin.disabled,
        callback: plugin.callback,
      }
    }),
  ]
    .filter((v) => !v.disabled)
    .map((doc, index) => {
      return {
        ...doc,
        _id: index,
        visible: true,
      }
    })
    .sort((a, b) => {
      const freqA = frequency.value[a.id] ?? 0
      const freqB = frequency.value[b.id] ?? 0
      return freqB - freqA
    })
})

const fzf = new Fzf(items.value, {
  selector: (item) => item.label,
})

const visibleIds = computed<
  { id: number; positions: number[]; score: number }[] | undefined
>(() => {
  if (!text.value) {
    return undefined
  }

  const results = fzf.find(text.value)
  return results.map((v) => {
    return {
      id: v.item._id,
      positions: [...v.positions],
      score: v.score,
    }
  })
})

const allCommands = computed<MappedCommandItem[]>(() => {
  if (!text.value) {
    return items.value
  }

  return items.value
    .map((v) => {
      const found = visibleIds.value?.find((w) => w.id === v._id)
      return {
        ...v,
        visible: visibleIds.value === undefined || !!found,
        positions: found?.positions,
        score: found?.score ?? 0,
      }
    })
    .sort((a, b) => {
      // Primary sort by search score
      const scoreDiff = b.score - a.score
      if (scoreDiff !== 0) {
        return scoreDiff
      }
      // Secondary sort by frequency (tiebreaker)
      const freqA = frequency.value[a.id] ?? 0
      const freqB = frequency.value[b.id] ?? 0
      return freqB - freqA
    })
})

const visibleCommands = computed<MappedCommandItem[]>(() => {
  return allCommands.value.filter((v) => v.visible !== false)
})

watch(selection.uuids, () => emit('close'))

const onSelect = (id: string) => {
  const command = items.value.find((v) => v.id === id)
  if (command) {
    incrementFrequency(id)
    command.callback()
    emit('close')
  }
}

const onSelectByIndex = (index: number) => {
  const command = visibleCommands.value[index]
  if (command) {
    onSelect(command.id)
  }
}
</script>
