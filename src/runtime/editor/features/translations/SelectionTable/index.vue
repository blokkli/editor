<template>
  <div>
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
defineProps<{
  selectedCount?: number
  totalCount: number
  showSelection?: boolean
}>()

defineEmits<{
  'toggle-all': []
}>()
</script>

<style lang="postcss">
.bk .bk-csv-table {
  border-collapse: collapse;

  th {
    @apply text-left p-8 bg-mono-200 font-semibold text-mono-700 sticky top-0 z-50;
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
