<template>
  <PanelSection
    :title="$t('chartsCsvGroupBy', 'Group series by')"
    :help="
      $t(
        'chartsCsvGroupByDescription',
        'Each distinct combination across these columns becomes one data series.',
      )
    "
  >
    <PanelItem
      v-for="col in modelValue"
      :key="col"
      :title="headerCells[col] || `Column ${col + 1}`"
      icon="bk_mdi_stack_group"
    >
      <template #actions>
        <ButtonAction
          :label="$t('chartsCsvGroupByRemove', 'Remove grouping column')"
          icon="bk_mdi_delete"
          theme="danger"
          @click.stop="remove(col)"
        />
      </template>
    </PanelItem>

    <PanelAddButton
      v-if="availableColumns.length > 0 && !adding"
      :label="$t('chartsCsvGroupByAdd', 'Add a grouping column')"
      @click="adding = true"
    />

    <div v-if="adding" class="p-15 border-t border-mono-300">
      <FormSelect
        id="charts-csv-groupby-add"
        v-model="draft"
        :label="$t('chartsCsvGroupByPickColumn', 'Pick a column…')"
        :options="addOptions"
      />
      <div class="flex gap-5 mt-10">
        <button
          type="button"
          class="bk-button is-primary"
          :disabled="!draft"
          @click="confirmAdd"
        >
          {{ $t('chartsCsvGroupByAddConfirm', 'Add') }}
        </button>
        <button type="button" class="bk-button" @click="cancelAdd">
          {{ $t('chartsCsvFilterCancel', 'Cancel') }}
        </button>
      </div>
    </div>
  </PanelSection>
</template>

<script setup lang="ts">
import { ref, computed, useBlokkli } from '#imports'
import { FormSelect } from '#blokkli/editor/components'
import ButtonAction from '#blokkli/editor/components/ButtonAction/index.vue'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import PanelItem from '#blokkli/editor/components/Panel/Item/index.vue'
import PanelAddButton from '#blokkli/editor/components/Panel/AddButton/index.vue'
import { type CsvGrid, columnLabelWithSample } from '../csvHelpers'

const props = defineProps<{
  modelValue: number[]
  grid: CsvGrid
  headerCells: string[]
  availableColumns: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [number[]]
}>()

const { $t } = useBlokkli()

const adding = ref(false)
const draft = ref<string>('')

const addOptions = computed(() => [
  { value: '', label: $t('chartsCsvGroupByPickColumn', 'Pick a column…') },
  ...props.availableColumns.map((i) => ({
    value: String(i),
    label: columnLabelWithSample(props.grid, i),
  })),
])

function confirmAdd() {
  const n = Number(draft.value)
  if (!Number.isFinite(n)) return
  if (!props.modelValue.includes(n)) {
    emit('update:modelValue', [...props.modelValue, n])
  }
  cancelAdd()
}

function cancelAdd() {
  adding.value = false
  draft.value = ''
}

function remove(col: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((c) => c !== col),
  )
}
</script>
