<template>
  <PanelSection :title="$t('chartsFootnotes', 'Footnotes')">
    <template v-if="footnotes.length" #default>
      <table class="bk-chart-data-table border-collapse w-full">
        <tbody>
          <tr v-for="(note, i) in footnotes" :key="i">
            <td class="size-40">
              <div class="flex items-center justify-center h-full bg-mono-100">
                <span
                  class="text-xs leading-none font-bold text-white bg-mono-600 size-25 rounded-full flex items-center justify-center"
                  >{{ i + 1 }}</span
                >
              </div>
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
