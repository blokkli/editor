<template>
  <div class="bk-chart-data-table-footnotes">
    <label class="bk-form-label">{{ $t('chartsFootnotes', 'Footnotes') }}</label>
    <div
      v-for="(note, i) in footnotes"
      :key="i"
      class="bk-chart-data-table-footnote-row"
    >
      <span class="bk-chart-data-table-footnote-marker">{{
        superscriptFor(i + 1)
      }}</span>
      <input
        type="text"
        :value="note"
        class="bk-form-input"
        @change="updateFootnote(i, ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="bk-chart-data-table-remove"
        @click="removeFootnote(i)"
      >
        <Icon name="bk_mdi_delete" />
      </button>
    </div>
    <button type="button" class="bk-button bk-is-small" @click="addFootnote">
      <Icon name="bk_mdi_add" />
      {{ $t('chartsAddFootnote', 'Add footnote') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'
import { SUPERSCRIPTS } from '../../../../types'
import { Icon } from '#blokkli/editor/components'

const { $t } = useBlokkli()

const props = defineProps<{
  footnotes: string[]
}>()

const emit = defineEmits<{
  'update:footnotes': [value: string[]]
}>()

function superscriptFor(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUPERSCRIPTS[d] || d)
    .join('')
}

function updateFootnote(index: number, value: string) {
  const updated = [...props.footnotes]
  updated[index] = value
  emit('update:footnotes', updated)
}

function addFootnote() {
  emit('update:footnotes', [...props.footnotes, ''])
}

function removeFootnote(index: number) {
  emit(
    'update:footnotes',
    props.footnotes.filter((_, i) => i !== index),
  )
}
</script>
