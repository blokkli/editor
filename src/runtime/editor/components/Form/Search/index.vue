<template>
  <div
    ref="wrapperEl"
    class="relative"
    :class="{ 'pointer-events-none': disabled }"
    @focusin="isFocused = true"
    @focusout="onFocusOut"
  >
    <label class="bk-form-label" :for="id">
      {{ label }}<span v-if="required" class="bk-required-indicator">*</span>
    </label>

    <div
      v-if="selectedLabel"
      class="flex items-center gap-5 h-[46px] px-10 bg-mono-50 text-mono-950 border border-mono-200"
      :class="{ 'opacity-50': disabled }"
    >
      <Icon
        :name="icon ?? 'bk_mdi_search'"
        class="[&_svg]:size-15 [&_svg]:fill-mono-500"
      />
      <span class="flex-1 truncate text-sm font-medium">
        {{ selectedLabel }}
      </span>
      <button
        type="button"
        class="flex items-center justify-center p-3 text-mono-500 hover:bg-mono-200 hover:text-mono-900 [&_svg]:size-15 [&_svg]:fill-current"
        :title="$t('formSearchClear', 'Clear')"
        :disabled
        @click="$emit('clear')"
      >
        <Icon name="bk_mdi_close" />
      </button>
    </div>

    <div
      v-else
      class="relative h-[46px] focus-within:z-[5000]"
      :class="{ 'opacity-50': disabled }"
    >
      <div
        class="overflow-hidden bg-white"
        :class="{ 'ring-4 ring-accent-700': isFocused }"
      >
        <div class="group/search relative">
          <Icon
            :name="icon ?? 'bk_mdi_search'"
            class="absolute top-1/2 left-10 -translate-y-1/2 pointer-events-none [&_svg]:size-20 [&_svg]:fill-mono-500 group-focus-within/search:[&_svg]:fill-accent-700"
          />
          <input
            :id
            ref="inputEl"
            v-model="query"
            type="text"
            class="bk-form-input pl-[35px]! focus:ring-0!"
            autocomplete="off"
            :placeholder
            :required
            :disabled
            @keydown="onKeyDown"
          />
          <Icon
            v-if="mode === 'async' && loading"
            name="spinner"
            class="absolute top-1/2 right-10 -translate-y-1/2 animate-spin pointer-events-none [&_svg]:size-20 [&_svg]:fill-mono-500"
          />
        </div>

        <div
          v-if="showDropdown"
          ref="resultsEl"
          class="bk-scrollbar-light bg-white overflow-y-auto overscroll-contain border-t border-t-mono-300 max-h-[400px]"
        >
          <div
            v-if="mode === 'async' && loading && filteredItems.length === 0"
            class="text-mono-500 text-sm py-15 text-center"
          >
            {{ $t('formSearchLoading', 'Loading...') }}
          </div>
          <div
            v-else-if="filteredItems.length === 0"
            class="text-mono-500 text-sm py-15 text-center"
          >
            {{ $t('formSearchNoResults', 'No results.') }}
          </div>
          <template v-else>
            <div v-for="group in grouped" :key="group.category">
              <div
                v-if="!disableGrouping && group.category"
                class="text-xs font-semibold text-mono-600 uppercase px-10 py-8 bg-mono-50"
              >
                {{ group.category }}
              </div>
              <button
                v-for="indexed in group.items"
                :key="indexed.value.key"
                type="button"
                class="bk-form-search-result w-full px-10 py-8 bg-transparent border-0 cursor-pointer text-base text-left text-mono-950 font-medium overflow-hidden hover:bg-accent-50 hover:text-accent-700 [&_.bk-highlight]:line-clamp-2"
                :class="{
                  'bg-accent-50! text-accent-700!':
                    focusedIndex === indexed.flatIndex,
                }"
                @mousedown.prevent
                @click="onSelect(indexed.value)"
                @mouseenter="focusedIndex = indexed.flatIndex"
              >
                <slot
                  :item="indexed.value"
                  :is-focused="focusedIndex === indexed.flatIndex"
                  :query="query"
                >
                  <Highlight
                    :text="indexed.value.label"
                    :positions="indexed.value.positions"
                    tag="span"
                  />
                  <span
                    v-if="indexed.value.description"
                    class="block text-xs mt-2 truncate font-normal text-mono-600"
                  >
                    {{ indexed.value.description }}
                  </span>
                </slot>
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="description" class="bk-form-description">{{ description }}</div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
  shallowRef,
  useBlokkli,
  useTemplateRef,
  watch,
} from '#imports'
import { Highlight, Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { loadFzf, type Fzf } from '#blokkli/editor/libraries/fzf'
import { modulo } from '#blokkli/editor/helpers/math'
import type { FormSearchItem } from './types'

export type { FormSearchItem }

const props = withDefaults(
  defineProps<{
    /** Form `id` attribute, also used as `for=` on the label. */
    id: string

    /** Field label shown above the input. */
    label: string

    /** Optional small description shown under the input. */
    description?: string

    /** Marks the field as required (asterisk + form validation). */
    required?: boolean

    /** Disables the input and prevents the dropdown from opening. */
    disabled?: boolean

    /**
     * Items to search/render. In `'fzf'` mode this is the full candidate
     * list; in `'async'` mode it should already be filtered by the caller.
     */
    items: FormSearchItem[]

    /** Input placeholder. */
    placeholder?: string

    /** Leading icon. Defaults to `bk_mdi_search`. */
    icon?: BlokkliIcon

    /** Async-only: shows a spinner inside the input while truthy. */
    loading?: boolean

    /** Render results as a flat list with no group headers. */
    disableGrouping?: boolean

    /**
     * `'fzf'` (default) — component runs `Fzf` over `items` itself, populates
     * `positions` for each match, and shows the full list (locale-sorted) when
     * the query is empty.
     *
     * `'async'` — component renders `items` as-is, with no internal filtering.
     */
    mode?: 'fzf' | 'async'

    /**
     * Custom selector for fzf. Defaults to `(item) => item.label`.
     */
    fzfSelector?: (item: FormSearchItem) => string

    /**
     * When set, the component renders a "selected" chip (label + clear
     * button) instead of the search input. The clear button emits `clear`
     * so the consumer can reset its own state and switch back to search
     * mode. Useful for select-style consumers (e.g. picking a single link).
     */
    selectedLabel?: string
  }>(),
  {
    description: undefined,
    placeholder: undefined,
    icon: undefined,
    disableGrouping: false,
    loading: false,
    mode: 'fzf',
    fzfSelector: undefined,
    selectedLabel: undefined,
  },
)

const emit = defineEmits<{
  select: [FormSearchItem]
  clear: []
}>()

const query = defineModel<string>('query', { default: '' })

const { $t } = useBlokkli()

const wrapperEl = useTemplateRef('wrapperEl')
const inputEl = useTemplateRef('inputEl')

const isFocused = ref(false)
// -1 means "no item highlighted yet". The first ArrowDown sets it to 0
// so the first visible item lights up exactly when the user expects.
const focusedIndex = ref(-1)
const resultsEl = useTemplateRef<HTMLElement>('resultsEl')

// fzf instance — recreated when `items` (or selector) change.
const fzf = shallowRef<Fzf<FormSearchItem[]> | null>(null)

async function rebuildFzf() {
  if (props.mode !== 'fzf') {
    fzf.value = null
    return
  }
  const { Fzf } = await loadFzf()
  const selector = props.fzfSelector ?? ((item: FormSearchItem) => item.label)
  fzf.value = new Fzf(props.items, { selector })
}

onMounted(rebuildFzf)
watch(() => [props.mode, props.items, props.fzfSelector], rebuildFzf)

const filteredItems = computed<FormSearchItem[]>(() => {
  if (props.mode === 'async') {
    return props.items
  }

  const q = query.value.trim()
  if (!q) {
    return [...props.items].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    )
  }

  if (!fzf.value) {
    // fzf not loaded yet — fall back to a substring filter so typing is
    // never blocked by the lazy import.
    const lower = q.toLowerCase()
    return props.items.filter((item) =>
      item.label.toLowerCase().includes(lower),
    )
  }

  return fzf.value.find(q).map((entry) => ({
    ...entry.item,
    positions: Array.from(entry.positions),
  }))
})

interface IndexedItem {
  value: FormSearchItem
  flatIndex: number
}

interface GroupedResult {
  category: string
  items: IndexedItem[]
}

const grouped = computed<GroupedResult[]>(() => {
  let buckets: { category: string; items: FormSearchItem[] }[]

  if (props.disableGrouping) {
    buckets = [{ category: '', items: filteredItems.value }]
  } else {
    const otherLabel = $t('formSearchOther', 'Other')
    const map = new Map<string, FormSearchItem[]>()
    for (const item of filteredItems.value) {
      const cat = item.category || otherLabel
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    buckets = [...map.entries()]
      .sort(([a], [b]) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }),
      )
      .map(([category, items]) => ({ category, items }))
  }

  // Assign flatIndex in visual order so keyboard navigation matches what
  // the user sees, not the order of the underlying `items` array.
  let flatIndex = 0
  return buckets.map(({ category, items }) => ({
    category,
    items: items.map((value) => ({ value, flatIndex: flatIndex++ })),
  }))
})

const flatItems = computed<FormSearchItem[]>(() =>
  grouped.value.flatMap((g) => g.items.map((i) => i.value)),
)

const showDropdown = computed(() => {
  if (props.disabled || !isFocused.value) return false
  if (filteredItems.value.length > 0) return true
  if (props.mode === 'async') {
    // Async dropdown stays open while loading or with a non-empty query so
    // the spinner / no-results message can render.
    return props.loading || query.value.trim().length > 0
  }
  return false
})

watch(filteredItems, () => {
  focusedIndex.value = -1
})

watch(focusedIndex, (idx) => {
  if (idx < 0) return
  const items = resultsEl.value?.querySelectorAll('.bk-form-search-result')
  const child = items?.[idx] as HTMLElement | undefined
  child?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
})

function onSelect(item: FormSearchItem) {
  emit('select', item)
  query.value = ''
  inputEl.value?.blur()
}

function onFocusOut(e: FocusEvent) {
  if (
    e.relatedTarget instanceof Node &&
    wrapperEl.value?.contains(e.relatedTarget)
  ) {
    return
  }
  isFocused.value = false
}

function onKeyDown(e: KeyboardEvent) {
  const len = flatItems.value.length

  if (e.key === 'Escape') {
    e.preventDefault()
    inputEl.value?.blur()
    return
  }

  if (!len) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    focusedIndex.value =
      focusedIndex.value < 0 ? 0 : modulo(focusedIndex.value + 1, len)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    focusedIndex.value =
      focusedIndex.value < 0 ? len - 1 : modulo(focusedIndex.value - 1, len)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    // Enter without prior keyboard nav still selects the first match —
    // typical autocomplete behaviour after typing a query.
    const idx = focusedIndex.value < 0 ? 0 : focusedIndex.value
    const item = flatItems.value[idx]
    if (item) onSelect(item)
  }
}

defineExpose({
  focus: () => inputEl.value?.focus(),
  select: () => inputEl.value?.select(),
})
</script>

<style lang="postcss">
.bk {
  /*
   * The only rule that doesn't fit in a Tailwind utility: an adjacent-sibling
   * separator between visible result rows (no usable Tailwind variant for
   * `+ &`). Everything else lives inline in the template.
   */
  .bk-form-search-result + .bk-form-search-result {
    @apply border-t border-mono-100;
  }
}
</style>
