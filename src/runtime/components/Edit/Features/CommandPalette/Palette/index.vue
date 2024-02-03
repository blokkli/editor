<template>
  <div
    class="bk-command-palette bk-control"
    @wheel.stop
    @keydown="onKeyDown"
    @click.stop
  >
    <div class="bk-command-palette-input">
      <Icon name="command" />
      <input
        ref="inputEl"
        v-model="text"
        type="text"
        :placeholder="
          $t('commandPalette.inputPlaceholder', 'Search commands...')
        "
      />
    </div>
    <div class="bk-command-palette-results">
      <Group
        v-for="group in groups"
        :key="group.id"
        :label="group.label"
        :commands="group.commands"
        :visible-ids="visibleIds"
        :regex="regex"
        :focused-id="focusedId"
        @close="$emit('close')"
        @focus="focusedId = $event"
        @select="onSelect($event)"
      />
    </div>
  </div>
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
} from '#imports'
import { Icon } from '#blokkli/components'
import type { Command, CommandGroup } from '#blokkli/types'
import Group from './Group/index.vue'
import FlexSearch from 'flexsearch'
import { falsy } from '#blokkli/helpers'

const { commands, $t, selection } = useBlokkli()

const emit = defineEmits(['close'])

const inputEl = ref<HTMLInputElement | null>(null)
const text = ref('')
const focusedId = ref('')

const words = computed(() =>
  text.value
    .toLowerCase()
    .trim()
    .split(' ')
    .map((v) => v.trim())
    .filter(Boolean),
)

const regex = computed(() => {
  if (!words.value.length) {
    return
  }
  // Join all words into a regex.
  const pattern = words.value
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')

  return new RegExp(pattern, 'gi')
})

type GroupedCommands = {
  id: CommandGroup
  label: string
  commands: Array<Command & { _id: number }>
}

const getGroupLabel = (id: CommandGroup): string => {
  if (id === 'ui') {
    return $t('commandGroup.ui', 'Interface')
  } else if (id === 'add') {
    return $t('commandGroup.add', 'Add new')
  } else if (id === 'action') {
    return $t('commandGroup.action', 'Actions')
  } else if (id === 'selection') {
    return $t('commandGroup.selection', 'Selection')
  } else if (id === 'misc') {
    return $t('commandGroup.misc', 'Miscellaneous')
  }

  return id
}

const groupOrder = computed<CommandGroup[]>(() => {
  // When blocks are selected, the block actions should be first.
  if (selection.uuids.value.length) {
    return ['selection', 'add']
  }
  return ['add']
})

const items = computed<Array<Command & { _id: number }>>(() =>
  commands
    .getCommands()
    .filter((v) => !v.disabled)
    .map((doc, index) => {
      return {
        ...doc,
        _id: index,
      }
    }),
)

const index = new FlexSearch.Index({ preset: 'match', tokenize: 'full' })

items.value.forEach((item) => {
  index.add(item._id, item.label)
})

const visibleIds = computed<number[] | undefined>(() => {
  if (!text.value) {
    return undefined
  }

  return index.search(text.value).map((v) => {
    if (typeof v === 'number') {
      return v
    }
    return parseInt(v)
  })
})

const groups = computed<GroupedCommands[]>(() => {
  return Object.values(
    items.value.reduce<Record<string, GroupedCommands>>((acc, command) => {
      const group = command.group || 'misc'
      if (!acc[group]) {
        acc[group] = {
          id: group,
          label: getGroupLabel(group),
          commands: [],
        }
      }

      acc[group].commands.push(command)
      return acc
    }, {}),
  ).sort((a, b) => {
    const indexA = groupOrder.value.indexOf(a.id)
    const indexB = groupOrder.value.indexOf(b.id)

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

watch(text, () => {
  nextTick(() => {
    focusFirst()
  })
})

watch(selection.uuids, () => emit('close'))

const focusFirst = () => {
  const element = document.querySelector(
    '.bk-command-palette .bk-command[data-command-visible="true"]',
  )
  if (element instanceof HTMLElement) {
    focusedId.value = element.dataset.commandId || ''
  }
}

const getCommandElements = () => {
  return [
    ...document.querySelectorAll(
      '.bk-command-palette .bk-command[data-command-visible="true"]',
    ),
  ]
    .map((el) => {
      if (el instanceof HTMLElement) {
        const id = el.dataset.commandId
        if (id) {
          return {
            id,
            el,
            focused: focusedId.value === id,
          }
        }
      }
    })
    .filter(falsy)
}

const focusPrev = () => {
  const elements = getCommandElements()
  if (elements.length === -1) {
    return
  }
  const focusedIndex = elements.findIndex((v) => v.focused)
  // None or first is focused.
  if (focusedIndex <= 0) {
    // Focus last element.
    focusedId.value = elements[elements.length - 1].id
  } else {
    focusedId.value = elements[focusedIndex - 1].id
  }
  scrollFocusedIntoView()
}

const focusNext = () => {
  const elements = getCommandElements()
  if (elements.length === -1) {
    return
  }
  const focusedIndex = elements.findIndex((v) => v.focused)
  // None or last is focused.
  if (focusedIndex === -1 || focusedIndex === elements.length - 1) {
    // Focus last element.
    focusedId.value = elements[0].id
  } else {
    focusedId.value = elements[focusedIndex + 1].id
  }

  scrollFocusedIntoView()
}

const scrollFocusedIntoView = () => {
  const element = getCommandElements().find((v) => v.focused)?.el
  if (element) {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}

const onSelect = (id: string) => {
  const command = items.value.find((v) => v.id === id)
  if (command) {
    command.callback()
    emit('close')
  }
}

const onKeyDown = (e: KeyboardEvent) => {
  const stop = () => {
    e.preventDefault()
    e.stopPropagation()
  }
  if (e.code === 'Tab') {
    e.shiftKey ? focusPrev() : focusNext()
    stop()
  } else if (e.code === 'ArrowDown') {
    stop()
    focusNext()
  } else if (e.code === 'ArrowUp') {
    stop()
    focusPrev()
  } else if (e.code === 'Enter') {
    onSelect(focusedId.value)
    stop()
  } else if (e.code === 'Escape') {
    emit('close')
    stop()
  }
}

const onWindowClick = () => {
  emit('close')
}

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
