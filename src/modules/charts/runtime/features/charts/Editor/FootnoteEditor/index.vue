<template>
  <PanelSection
    :title="$t('chartsFootnotes', 'Footnotes')"
    :help="
      $t(
        'chartsFootnotesHelp',
        'Footnotes are numbered automatically. Reference them in category or series labels using {1}, {2}, etc.',
      )
    "
  >
    <table
      v-if="footnotes.length"
      class="bk-chart-data-table border-collapse w-full"
    >
      <tbody>
        <tr v-for="(note, i) in footnotes" :key="i">
          <td class="size-40">
            <button
              type="button"
              class="size-full flex items-center justify-center text-sm font-medium bg-mono-100 hover:bg-mono-200"
              @click.prevent="copyFootnoteToClipboard(i)"
            >
              <span>{</span>
              <span>{{ i + 1 }}</span>
              <span>}</span>
            </button>
          </td>
          <td>
            <input
              type="text"
              :value="note"
              class="bk-chart-data-table-input"
              @change="
                updateFootnote(i, ($event.target as HTMLInputElement).value)
              "
            />
          </td>
          <td class="w-0">
            <button
              type="button"
              class="bk-chart-data-table-remove bk-chart-data-table-input"
              @click="removeFootnote(i)"
            >
              <Icon name="bk_mdi_delete" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <PanelAddButton
      :label="$t('chartsAddFootnote', 'Add footnote')"
      @click="addFootnote"
    />
  </PanelSection>
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import PanelAddButton from '#blokkli/editor/components/Panel/AddButton/index.vue'

const { $t } = useBlokkli()

defineProps<{
  footnotes: string[]
  addFootnote: () => void
  removeFootnote: (index: number) => void
  updateFootnote: (index: number, value: string) => void
}>()

function copyFootnoteToClipboard(index: number) {
  if (navigator.clipboard.writeText) {
    navigator.clipboard.writeText(`{${index + 1}}`)
  }
}
</script>
