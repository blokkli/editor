<template>
  <ScrollBoundary
    class="bk-command-palette bk-control"
    @keydown="onKeyDown"
    @keyup.stop
    @click.stop
    @mousemove.once="hasUsedMouse = true"
  >
    <div class="bk-command-palette-input">
      <Icon name="bk_mdi_keyboard_command_key" />
      <input
        ref="inputEl"
        v-model="text"
        type="text"
        :placeholder="
          $t('commandPalette.inputPlaceholder', 'Search commands...')
        "
      />
    </div>
    <div class="bk-command-palette-results bk-scrollbar-dark">
      <div class="bk-command-palette-results-list">
        <div>
          <Item
            v-for="item in allCommands"
            v-show="item.visible"
            :key="item.id"
            :item="item"
            :index="getVisibleIndex(item.id)"
            :is-focused="focusedIndex === getVisibleIndex(item.id)"
            @focus="onFocus"
            @select="onSelect"
          />
        </div>
      </div>
    </div>
  </ScrollBoundary>
</template>

<script lang="ts" setup>
import {
  computed,
  onMounted,
  ref,
  useBlokkli,
  watch,
  nextTick,
  onBeforeUnmount,
  useTemplateRef,
} from '#imports'
import { Icon, ScrollBoundary } from '#blokkli/components'
import type { Command } from '#blokkli/types'
import { Fzf } from 'fzf'
import { modulo } from '#blokkli/editor/helpers/math'
import Item, { type MappedCommandItem } from './Item/index.vue'
import { onBlokkliEvent } from '#blokkli/editor/composables'

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

const inputEl = useTemplateRef('inputEl')
const text = ref('')
const focusedIndex = ref(0)
const hasUsedMouse = ref(false)

function onFocus(index: number) {
  if (!hasUsedMouse.value) {
    return
  }
  focusedIndex.value = index
}

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

const getVisibleIndex = (id: string): number => {
  return visibleCommands.value.findIndex((v) => v.id === id)
}

watch(text, () => {
  nextTick(() => {
    focusFirst()
  })
})

watch(selection.uuids, () => emit('close'))

const focusFirst = () => {
  focusedIndex.value = 0
}

const focusPrev = () => {
  if (visibleCommands.value.length === 0) {
    return
  }
  focusedIndex.value = modulo(
    focusedIndex.value - 1,
    visibleCommands.value.length,
  )
}

const focusNext = () => {
  if (visibleCommands.value.length === 0) {
    return
  }
  focusedIndex.value = modulo(
    focusedIndex.value + 1,
    visibleCommands.value.length,
  )
}

const onSelect = (id: string) => {
  const command = items.value.find((v) => v.id === id)
  if (command) {
    incrementFrequency(id)
    command.callback()
    emit('close')
  }
}

const onKeyDown = (e: KeyboardEvent) => {
  e.stopPropagation()
  if (e.code === 'KeyK' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    emit('close')
    return
  }
  if (e.code === 'Tab') {
    e.preventDefault()
    if (e.shiftKey) {
      focusPrev()
    } else {
      focusNext()
    }
  } else if (
    e.code === 'ArrowDown' ||
    (e.code === 'KeyJ' && (e.ctrlKey || e.metaKey))
  ) {
    e.preventDefault()
    focusNext()
  } else if (e.code === 'ArrowUp') {
    e.preventDefault()
    focusPrev()
  } else if (e.code === 'Enter') {
    e.preventDefault()
    const command = visibleCommands.value[focusedIndex.value]
    if (command) {
      onSelect(command.id)
    }
  } else if (e.code === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

const onWindowClick = () => {
  emit('close')
}

onBlokkliEvent('overlay:close', () => {
  emit('close')
})

onMounted(() => {
  if (inputEl.value) {
    inputEl.value.focus()
    focusFirst()
  }

  document.body.addEventListener('click', onWindowClick)
})

onBeforeUnmount(() => {
  document.body.removeEventListener('click', onWindowClick)
})
</script>
