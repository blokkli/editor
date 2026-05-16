<template>
  <table class="bk-agent-attachment-table">
    <thead>
      <tr>
        <th v-for="(cell, j) in headerRow" :key="j">{{ cell }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, i) in bodyRows" :key="i">
        <td v-for="(cell, j) in row" :key="j">{{ cell }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts" setup>
import { computed } from '#imports'

const props = defineProps<{
  content: string
}>()

function parseRow(line: string): string[] {
  return line.split(',').map((cell) => cell.trim())
}

const headerRow = computed(() => {
  const firstLine = props.content.trim().split('\n')[0]
  return firstLine ? parseRow(firstLine) : []
})

const bodyRows = computed(() => {
  return props.content.trim().split('\n').slice(1).map(parseRow)
})
</script>

<style lang="postcss">
.bk-agent-attachment-table {
  @apply w-full text-sm border-collapse;

  th,
  td {
    @apply border border-mono-300 px-10 py-5 text-left;
  }

  th {
    @apply bg-mono-100 font-semibold;
  }

  tr:hover td {
    @apply bg-mono-50;
  }
}
</style>
