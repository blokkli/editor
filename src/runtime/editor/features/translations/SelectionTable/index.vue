<template>
  <div class="flex items-end justify-between flex-wrap gap-10 pb-15">
    <span v-if="showSelection" class="text-mono-900 text-lg font-bold">
      {{ selectedCount }}/{{ totalCount }}
      {{ label }}
    </span>
    <slot name="toolbar" />
    <div v-if="showFilters">
      <div class="bk-form-label">Filter</div>
      <div class="flex items-center gap-20">
        <FormToggle
          v-model="onlyOutdated"
          :label="
            $t('translationsCsvOnlyOutdated', 'Only outdated translations')
          "
        />
        <FormToggle
          v-model="onlyUntranslated"
          :label="$t('translationsCsvOnlyMissing', 'Only missing translations')"
        />
      </div>
    </div>
  </div>
  <div class="border border-mono-300 rounded overflow-auto flex-1">
    <table class="bk-csv-table w-full text-sm select-text">
      <thead>
        <tr>
          <th v-if="showSelection" class="w-40">
            <div class="bk-checkbox">
              <input
                type="checkbox"
                :checked="selectedCount === totalCount && totalCount > 0"
                @change="$emit('toggle-all')"
              />
              <span class="!mt-0 before:!mt-0" />
            </div>
          </th>
          <slot name="header" />
        </tr>
      </thead>
      <tbody>
        <slot name="body" />
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { FormToggle } from '#blokkli/editor/components'

defineProps<{
  selectedCount?: number
  totalCount: number
  label?: string
  showSelection?: boolean
  showFilters?: boolean
}>()

const onlyOutdated = defineModel<boolean>('onlyOutdated')
const onlyUntranslated = defineModel<boolean>('onlyUntranslated')

defineEmits<{
  'toggle-all': []
}>()

const { $t } = useBlokkli()
</script>

<style lang="postcss">
.bk .bk-csv-table {
  border-collapse: collapse;

  th {
    @apply text-left p-8 bg-mono-100 font-semibold text-mono-700 sticky top-0 z-50;
  }

  td {
    @apply p-8 border-t border-t-mono-200;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  tr:hover td {
    @apply bg-mono-50;
  }

  .bk-is-empty {
    @apply text-mono-400 italic;
  }
}
</style>
