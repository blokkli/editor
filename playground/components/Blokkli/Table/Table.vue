<template>
  <div :class="{ 'container mx-auto my-20': !parentType }">
    <div
      v-blokkli-editable:markup="{ type: 'table' }"
      class="table"
      v-html="markup"
    />
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli } from '#imports'

const { parentType } = defineBlokkli({
  bundle: 'table',
  editor: {
    noAddForm: true,
    editTitle: (el) => el.innerText,
  },
})

defineProps<{
  markup: string
}>()
</script>

<style lang="postcss">
.table {
  @apply w-full;
  table {
    @apply w-full text-sm text-left rtl:text-right text-gray-500;

    thead {
      @apply text-xs text-gray-700 uppercase bg-gray-50;
      th,
      td {
        @apply px-20 py-5;
      }
    }

    tbody {
      tr {
        @apply bg-white border-b;
      }
      th,
      td {
        @apply px-20 py-15;
      }
    }
  }
}
</style>
