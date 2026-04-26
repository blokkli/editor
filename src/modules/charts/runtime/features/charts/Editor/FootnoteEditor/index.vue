<template>
  <PanelSection :title="$t('chartsFootnotes', 'Footnotes')">
    <template v-if="footnotes.length" #default>
      <div>
        <div
          v-for="(note, i) in footnotes"
          :key="i"
          class="flex items-center gap-8 mb-5 p-15"
        >
          <span
            class="text-mono-500 text-2xl font-semibold shrink-0 text-center"
            >{{ superscriptFor(i + 1) }}</span
          >
          <input
            type="text"
            :value="note"
            class="bk-form-input"
            @change="
              updateFootnote(i, ($event.target as HTMLInputElement).value)
            "
          />
          <button
            type="button"
            class="bk-chart-data-table-remove"
            @click="removeFootnote(i)"
          >
            <Icon name="bk_mdi_delete" />
          </button>
        </div>
      </div>
    </template>

    <template #actions>
      <PanelAction
        :title="$t('chartsAddFootnote', 'Add footnote')"
        icon="bk_mdi_add"
        @click="addFootnote"
      />
    </template>
  </PanelSection>
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'
import { SUPERSCRIPTS } from '../../../../helpers'
import { Icon } from '#blokkli/editor/components'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import PanelAction from '#blokkli/editor/components/Panel/Action/index.vue'

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
