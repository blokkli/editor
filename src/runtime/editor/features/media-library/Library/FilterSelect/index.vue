<template>
  <div
    ref="root"
    class="bk-media-library-filter-select"
    :class="{ 'bk-is-open': isOpen }"
    @keydown.stop="onKeydown"
  >
    <button type="button" @click="toggle">
      <div>
        <span class="bk-media-library-filter-select-label">{{ label }}</span>
        <span
          v-if="selectedLabel"
          class="bk-media-library-filter-select-value"
          >{{ selectedLabel }}</span
        >
      </div>
      <Icon name="bk_mdi_arrow_drop_down" />
    </button>
    <div
      v-if="isOpen"
      class="bk-media-library-filter-select-dropdown bk-scrollbar-dark"
    >
      <div
        v-if="options.length > 10"
        class="bk-media-library-filter-select-search"
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
          class="bk-media-library-filter-select-empty"
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
