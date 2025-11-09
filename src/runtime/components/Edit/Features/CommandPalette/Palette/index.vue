<template>
  <ScrollBoundary
    class="bk-command-palette bk-control"
    @keydown="onKeyDown"
    @keyup.stop
    @click.stop
    @mousemove.once="hasUsedMouse = true"
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
    <div class="bk-command-palette-results bk-scrollbar-dark">
      <div class="bk-command-palette-results-list">
        <div>
          <Item
            v-for="(item, index) in visibleCommands"
            :key="item.id"
            :item="item"
            :index="index"
            :is-focused="focusedIndex === index"
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
import { modulo } from '#blokkli/helpers'
import Item from './Item/index.vue'

const { commands, $t, selection, plugins } = useBlokkli()

const emit = defineEmits(['close'])

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
    ...plugins.getMenuButtons().map<Command>((plugin) => {
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
      }
    })
})

const fzf = new Fzf(items.value, {
  selector: (item) => item.label,
})

const visibleIds = computed<{ id: number; positions: number[] }[] | undefined>(
  () => {
    if (!text.value) {
      return undefined
    }

    const results = fzf.find(text.value)
    return results
      .map((v) => {
        return {
          id: v.item._id,
          positions: [...v.positions],
          score: v.score,
        }
      })
      .sort((a, b) => b.score - a.score)
  },
)

const visibleCommands = computed(() => {
  return items.value
    .map((v) => {
      const found = visibleIds.value?.find((w) => w.id === v._id)
      return {
        ...v,
        visible: visibleIds.value === undefined || !!found,
        positions: found?.positions,
      }
    })
    .filter((v) => v.visible)
})

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
