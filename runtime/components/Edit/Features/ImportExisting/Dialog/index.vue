<template>
  <DialogModal
    :title="title"
    :lead="lead"
    :width="600"
    :submitLabel="submitLabel"
    :can-submit="!!(sourceEntityUuid && selectedFields.length)"
    :is-loading="isLoading"
    @submit="onSubmit"
    @cancel="$emit('cancel')"
  >
    <div class="pb pb-dialog-form">
      <div class="pb-form-section">
        <h3 class="pb-form-label">Welche Inhalte möchten Sie importieren?</h3>
        <label v-for="field in state.mutatedFields.value" class="pb-checkbox">
          <input v-model="selectedFields" type="checkbox" :value="field.name" />
          <span>{{ field.label }}</span>
        </label>
      </div>
      <div class="pb-form-section">
        <label for="pb_search_term" class="pb-form-label"
          >Von welcher Seite möchten Sie importieren?</label
        >
        <input
          v-model="searchTerm"
          type="text"
          id="pb_search_term"
          class="pb-form-input"
          placeholder="Seiten durchsuchen"
          required
        />
      </div>
      <div>{{ entities.length }} von {{ total }} Seiten</div>
      <div
        class="pb-radio-list"
        :style="{ opacity: searchTerm !== resultsSearchTerm ? 0.5 : 1 }"
      >
        <label v-for="entity in entities" class="pb-radio">
          <input
            v-model="sourceEntityUuid"
            type="radio"
            :value="entity.uuid"
            name="entity"
          />
          <span>{{ entity.label }}</span>
        </label>
      </div>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { DialogModal } from '#pb/components'
import { PbImportItem } from '#pb/types'

const { state, adapter } = useBlokkli()

const emit = defineEmits<{
  (e: 'confirm', data: { sourceUuid: string; fields: string[] }): void
  (e: 'cancel'): void
}>()

const title = 'Von bestehender Seite importieren'
const lead =
  'Importieren Sie Inhalte von einer bestehenden Seite. Die Paragraphen werden an das Ende der Liste hinzugefügt. Diese Aktion kann rückgängig gemacht werden.'
const submitLabel = 'Inhalte importieren'

const searchTerm = ref('')
const resultsSearchTerm = ref('')
const sourceEntityUuid = ref('')
const selectedFields = ref<string[]>([])
const isLoading = ref(false)
const entities = ref<PbImportItem[]>([])
const total = ref(0)

let timeout: any = null

watch(searchTerm, (newTerm) => {
  clearTimeout(timeout)

  timeout = setTimeout(() => {
    loadResults(newTerm)
  }, 300)
})

async function loadResults(userInput = '') {
  const result = await adapter.getImportItems(userInput)
  entities.value = result.items
  total.value = result.total
  resultsSearchTerm.value = userInput
}

function onSubmit() {
  emit('confirm', {
    sourceUuid: sourceEntityUuid.value,
    fields: selectedFields.value,
  })
  isLoading.value = true
}

onMounted(() => {
  loadResults()
})

onBeforeUnmount(() => {
  clearTimeout(timeout)
})
</script>
