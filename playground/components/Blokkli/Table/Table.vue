<template>
  <div :class="{ 'container mx-auto my-20': !parentType }">
    <table class="table w-full min-h-30">
      <thead>
        <tr>
          <th>Tagline</th>
          <th>Title</th>
          <th>Text</th>
        </tr>
      </thead>
      <BlokkliField name="rows" :list="rows" tag="tbody" />
    </table>
  </div>
</template>

<script lang="ts" setup>
import type { FieldListItemTyped } from '#blokkli/generated-types'
import { defineBlokkli } from '#imports'

const { parentType } = defineBlokkli({
  bundle: 'table',
  chunkName: 'rare',
  editor: {
    addBehaviour: 'no-form',
    editTitle: (el) => el.textContent,
    getDraggableElement: (el) => el.querySelector('.table'),
  },
})

defineProps<{
  rows: FieldListItemTyped[]
}>()
</script>

<style lang="postcss">
.table {
  @apply w-full text-sm text-left rtl:text-right text-mono-500;

  th,
  td {
    @apply !text-left;
  }

  thead {
    @apply text-xs text-mono-700 uppercase bg-mono-50;
    th,
    td {
      @apply px-20 py-5;
    }
  }

  tbody {
    tr {
      @apply bg-white border-b border-b-mono-200;
    }
    th,
    td {
      @apply px-20 py-15;
    }
  }
}
</style>
