<template>
  <aside class="bk-styleguide-sidebar">
    <header class="bk-styleguide-sidebar-header">
      <h2>Styleguide</h2>
      <button
        type="button"
        class="bk-styleguide-sidebar-close"
        :aria-label="$t('close', 'Close')"
        @click="$emit('close')"
      >
        <Icon name="bk_mdi_close" />
      </button>
    </header>
    <div class="bk-styleguide-sidebar-search">
      <Icon name="bk_mdi_search" />
      <input
        v-model="filter"
        type="search"
        :placeholder="$t('styleguideFilterPlaceholder', 'Filter components')"
      />
    </div>
    <nav class="bk-styleguide-sidebar-list">
      <div
        v-for="group in groups"
        :key="group.label"
        class="bk-styleguide-group"
      >
        <h4>{{ group.label }}</h4>
        <ul>
          <li v-for="entry in group.entries" :key="entry.id">
            <button
              type="button"
              :class="{ 'bk-is-active': entry.id === activeId }"
              @click="$emit('select', entry.id)"
            >
              {{ entry.label }}
              <span>{{ entry.variants.length }}</span>
            </button>
          </li>
        </ul>
      </div>
      <p v-if="!groups.length" class="bk-styleguide-empty">
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
