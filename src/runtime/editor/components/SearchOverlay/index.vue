<template>
  <ScrollBoundary
    class="bk-command-palette bk-control rounded overflow-hidden"
    :style="{ '--bk-command-palette-item-height': itemHeight + 'px' }"
    @keydown="onKeyDown"
    @keyup.stop
    @click.stop
    @mousemove.once="hasUsedMouse = true"
  >
    <div
      class="text-xs font-semibold text-mono-100 uppercase tracking-wide h-40 flex items-center bg-mono-950 border-b border-b-mono-600 justify-between"
    >
      <span class="pl-15">{{ title }}</span>
      <button
        type="button"
        class="size-40 flex items-center justify-center hover:bg-mono-800"
        @click.prevent="$emit('close')"
      >
        <Icon name="bk_mdi_close" class="size-15" />
      </button>
    </div>
    <FormTextDark ref="inputEl" v-model="text" :placeholder />
    <div
      class="relative"
      :class="{
        'opacity-50': isSearching,
      }"
    >
      <div
        class="overflow-auto bk-scrollbar-dark relative max-h-[calc(100vh-300px)]"
        :style="{
          height: itemHeight * visibleItems + 'px',
        }"
      >
        <div v-if="totalItems" ref="itemsContainer" class="relative">
          <slot
            :focused-index="focusedIndex"
            :on-mouse-enter="onItemMouseEnter"
          />
        </div>
        <div
          v-else-if="text.trim() && !isSearching"
          class="p-20 text-mono-500 text-base text-center size-full flex items-center justify-center"
        >
          {{ $t('searchOverlayNoResults', 'No results found.') }}
        </div>
      </div>
      <Loading v-show="isLoading" theme="dark" />
    </div>
  </ScrollBoundary>
</template>

<script lang="ts" setup>
import {
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  useTemplateRef,
  useBlokkli,
  nextTick,
} from '#imports'
import {
  Icon,
  ScrollBoundary,
  Loading,
  FormTextDark,
} from '#blokkli/editor/components'
import { modulo } from '#blokkli/editor/helpers/math'
import { onBlokkliEvent } from '#blokkli/editor/composables'

const { $t } = useBlokkli()

const props = withDefaults(
  defineProps<{
    title: string
    totalItems: number
    isSearching?: boolean
    isLoading?: boolean
    placeholder?: string
    itemHeight?: number
    visibleItems?: number
  }>(),
  {
    placeholder: 'Search...',
    itemHeight: 46,
    visibleItems: 10,
  },
)

const emit = defineEmits<{
  (e: 'select', index: number): void
  (e: 'close'): void
}>()

const text = defineModel<string>('text', { default: '' })

const inputEl = useTemplateRef('inputEl')
const itemsContainer = useTemplateRef('itemsContainer')
const focusedIndex = ref(0)
const hasUsedMouse = ref(false)

function onItemMouseEnter(index: number) {
  if (!hasUsedMouse.value) {
    return
  }
  focusedIndex.value = index
}

watch(text, () => {
  nextTick(() => {
    focusedIndex.value = 0
  })
})

watch(focusedIndex, (index) => {
  const child = itemsContainer.value?.children[index] as HTMLElement | undefined
  if (child) {
    child.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
})

const focusPrev = () => {
  if (props.totalItems === 0) {
    return
  }
  focusedIndex.value = modulo(focusedIndex.value - 1, props.totalItems)
}

const focusNext = () => {
  if (props.totalItems === 0) {
    return
  }
  focusedIndex.value = modulo(focusedIndex.value + 1, props.totalItems)
}

const onKeyDown = (e: KeyboardEvent) => {
  e.stopPropagation()
  if (e.code === 'Tab') {
    e.preventDefault()
    if (e.shiftKey) {
      focusPrev()
    } else {
      focusNext()
    }
  } else if (e.code === 'ArrowDown') {
    e.preventDefault()
    focusNext()
  } else if (e.code === 'ArrowUp') {
    e.preventDefault()
    focusPrev()
  } else if (e.code === 'Enter') {
    e.preventDefault()
    if (props.totalItems > 0) {
      emit('select', focusedIndex.value)
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
  }

  document.body.addEventListener('click', onWindowClick)
})

onBeforeUnmount(() => {
  document.body.removeEventListener('click', onWindowClick)
})
</script>

<style lang="postcss">
.bk .bk-command-palette {
  @apply fixed bg-mono-900 z-command-palette w-[600px] left-1/2 -translate-x-1/2 pointer-events-auto;
  @apply top-120;
  @apply shadow-2xl shadow-mono-950/70;
  @apply border border-mono-600;
}
</style>
