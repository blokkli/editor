<template>
  <aside
    class="w-300 shrink-0 flex flex-col bg-white border-r border-r-mono-200"
  >
    <header
      class="flex items-center justify-between px-20 py-15 border-b border-b-mono-200"
    >
      <h2 class="text-base font-bold m-0">Styleguide</h2>
      <button
        type="button"
        class="size-30 flex items-center justify-center rounded text-mono-700 hover:bg-mono-100 hover:text-mono-950"
        :aria-label="$t('close', 'Close')"
        @click="$emit('close')"
      >
        <Icon name="bk_mdi_close" class="size-20" />
      </button>
    </header>
    <div class="flex items-center gap-8 px-20 py-10 border-b border-b-mono-200">
      <Icon name="bk_mdi_search" class="size-15 shrink-0 text-mono-500" />
      <input
        v-model="filter"
        type="search"
        class="w-full bg-transparent border-none outline-none text-sm text-mono-900 placeholder:text-mono-500"
        :placeholder="$t('styleguideFilterPlaceholder', 'Filter components')"
      />
    </div>
    <nav class="flex-1 overflow-y-auto py-10">
      <div
        v-for="group in groups"
        :key="group.label"
        class="mb-15 last:mb-0 border-b border-b-mono-300"
      >
        <h4 class="bk-form-label px-20">
          {{ group.label }}
        </h4>
        <ul class="flex flex-col">
          <li v-for="entry in group.entries" :key="entry.id">
            <button
              type="button"
              class="w-full flex items-center justify-between text-left px-20 py-8 text-sm"
              :class="
                entry.id === activeId
                  ? 'bg-accent-50 text-accent-900 [&_span]:text-accent-700'
                  : 'text-mono-700 hover:bg-mono-100 hover:text-mono-950 [&_span]:text-mono-500'
              "
              @click="$emit('select', entry.id)"
            >
              {{ entry.label }}
              <span class="text-xs tabular-nums">
                {{ entry.variants.length }}
              </span>
            </button>
          </li>
        </ul>
      </div>
      <p v-if="!groups.length" class="px-20 py-15 text-sm text-mono-500">
        {{ $t('styleguideNoMatches', 'No components match this filter.') }}
      </p>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { EditorEntry } from '#blokkli/editor/composables/defineEditorComponent'

const props = defineProps<{
  entries: EditorEntry[]
  activeId: string | null
}>()

defineEmits<{
  select: [id: string]
  close: []
}>()

const { $t } = useBlokkli()

const filter = ref('')

type Group = { label: string; entries: EditorEntry[] }

const groups = computed<Group[]>(() => {
  const term = filter.value.trim().toLowerCase()
  const matched = props.entries.filter((entry) => {
    if (!term) return true
    return (
      entry.label.toLowerCase().includes(term) ||
      entry.id.toLowerCase().includes(term) ||
      (entry.category ?? '').toLowerCase().includes(term)
    )
  })

  const byCategory = new Map<string, EditorEntry[]>()
  for (const entry of matched) {
    const key = entry.category ?? 'Uncategorized'
    const list = byCategory.get(key)
    if (list) {
      list.push(entry)
    } else {
      byCategory.set(key, [entry])
    }
  }

  return [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, entries]) => ({
      label,
      entries: entries.sort((a, b) => a.label.localeCompare(b.label)),
    }))
})
</script>

<script lang="ts">
export default {
  name: 'StyleguideSidebar',
}
</script>
