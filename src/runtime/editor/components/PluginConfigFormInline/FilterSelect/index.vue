<template>
  <div
    ref="root"
    class="bk-config-filter-select"
    :class="{ 'bk-is-open': isOpen }"
    @keydown.stop="onKeydown"
  >
    <button type="button" @click="toggle">
      <div>
        <span class="bk-config-filter-select-label">{{ label }}</span>
        <span
          v-if="selectedLabel"
          class="bk-config-filter-select-value"
          >{{ selectedLabel }}</span
        >
      </div>
      <Icon name="bk_mdi_arrow_drop_down" />
    </button>
    <div
      v-if="isOpen"
      class="bk-config-filter-select-dropdown bk-scrollbar-dark"
    >
      <div
        v-if="options.length > 10"
        class="bk-config-filter-select-search"
      >
        <input
          ref="searchInput"
          v-model="search"
          class="bk-form-input bk-is-small"
          type="text"
          :placeholder="$t('filterSelectSearch', 'Search...')"
        />
      </div>
      <ul ref="listEl">
        <li v-for="(option, index) in filteredOptions" :key="option.value">
          <button
            type="button"
            :class="{
              'bk-is-active': option.value === modelValue,
              'bk-is-highlighted': index === highlightedIndex,
            }"
            @click="select(option.value)"
            @mouseenter="highlightedIndex = index"
          >
            {{ option.label }}
          </button>
        </li>
        <li
          v-if="!filteredOptions.length"
          class="bk-config-filter-select-empty"
        >
          {{ $t('filterSelectNoResults', 'No results') }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  nextTick,
  watch,
  useTemplateRef,
  onBeforeUnmount,
  useBlokkli,
} from '#imports'
import { Icon } from '#blokkli/editor/components'

const { $t } = useBlokkli()

const props = defineProps<{
  label: string
  options: { value: string; label: string }[]
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const search = ref('')
const highlightedIndex = ref(-1)
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const root = useTemplateRef<HTMLElement>('root')
const listEl = useTemplateRef<HTMLElement>('listEl')

const selectedLabel = computed(() => {
  const option = props.options.find((o) => o.value === props.modelValue)
  return option?.label ?? ''
})

const filteredOptions = computed(() => {
  if (!search.value) {
    return props.options
  }
  const term = search.value.toLowerCase()
  return props.options.filter((o) => o.label.toLowerCase().includes(term))
})

watch(filteredOptions, () => {
  highlightedIndex.value = -1
})

function scrollToHighlighted() {
  if (!listEl.value || highlightedIndex.value < 0) {
    return
  }
  const buttons = listEl.value.querySelectorAll('button')
  buttons[highlightedIndex.value]?.scrollIntoView({ block: 'nearest' })
}

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    search.value = ''
    highlightedIndex.value = -1
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
}

function select(value: string) {
  emit('update:modelValue', value)
  isOpen.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (!isOpen.value) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      toggle()
    }
    return
  }

  const options = filteredOptions.value
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      highlightedIndex.value =
        highlightedIndex.value < options.length - 1
          ? highlightedIndex.value + 1
          : 0
      nextTick(scrollToHighlighted)
      break
    case 'ArrowUp':
      e.preventDefault()
      highlightedIndex.value =
        highlightedIndex.value > 0
          ? highlightedIndex.value - 1
          : options.length - 1
      nextTick(scrollToHighlighted)
      break
    case 'Enter': {
      e.preventDefault()
      const option = options[highlightedIndex.value]
      if (option) {
        select(option.value)
      }
      break
    }
    case 'Escape':
      e.preventDefault()
      isOpen.value = false
      break
  }
}

function onClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('click', onClickOutside, true)
  } else {
    document.removeEventListener('click', onClickOutside, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, true)
})
</script>

<style lang="postcss">
.bk-config-filter-select {
  @apply relative h-full;

  > button {
    @apply w-full h-full text-left px-10 cursor-pointer flex items-center justify-between;
    @apply min-w-[150px];

    > div:first-child {
      @apply flex flex-col h-full justify-center gap-5;
    }

    > .bk-icon {
      @apply w-25 h-25 text-mono-500 shrink-0 transition-transform;
      svg {
        @apply fill-current;
      }
    }

    .bk-config-filter-select-label {
      @apply text-xs uppercase tracking-wide font-semibold text-mono-500 leading-none;
    }

    .bk-config-filter-select-value {
      @apply text-sm font-semibold text-mono-900 !leading-none truncate max-w-full block;
    }
  }

  &.bk-is-open > button > .bk-icon {
    @apply rotate-180;
  }

  .bk-config-filter-select-dropdown {
    @apply absolute top-full left-0 w-full bg-white border border-mono-300 shadow-lg z-50 max-h-[300px] overflow-auto;

    .bk-config-filter-select-search {
      @apply sticky top-0 p-15 border-b border-mono-300 bg-white;
    }

    ul {
      @apply py-3;
    }

    li button {
      @apply w-full text-left px-20 py-8 text-sm cursor-pointer truncate text-mono-900;
      @apply hover:bg-accent-50 hover:text-accent-900;

      &.bk-is-highlighted {
        @apply bg-accent-50 text-accent-900;
      }

      &.bk-is-active {
        @apply bg-accent-100 text-accent-900 font-semibold;
      }
    }

    .bk-config-filter-select-empty {
      @apply px-20 py-10 text-sm text-mono-400 italic;
    }
  }
}
</style>
