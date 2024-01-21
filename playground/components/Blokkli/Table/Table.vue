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
    addBehaviour: 'no-form',
    editTitle: (el) => el.innerText,
    getDraggableElement: (el) => el.querySelector('.table'),
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
    @apply w-full text-sm text-left rtl:text-right text-mono-500;

    thead {
      @apply text-xs text-mono-700 uppercase bg-mono-50;
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
