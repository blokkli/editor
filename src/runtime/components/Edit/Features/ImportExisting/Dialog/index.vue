<template>
  <DialogModal
    :title="$t('importExistingDialogTitle')"
    :lead="$t('importExistingDialogLead')"
    :width="600"
    :submit-label="$t('importExistingDialogSubmit')"
    :can-submit="!!(sourceEntityUuid && selectedFields.length)"
    :is-loading="isLoading"
    @submit="onSubmit"
    @cancel="$emit('cancel')"
  >
    <div class="bk bk-dialog-form">
      <div class="bk-form-section">
        <h3 class="bk-form-label">
          {{ $t('importExistingFieldsLabel') }}
        </h3>
        <label v-for="field in fields" :key="field.name" class="bk-checkbox">
          <input v-model="selectedFields" type="checkbox" :value="field.name" />
          <span>{{ field.label }}</span>
        </label>
      </div>
      <div class="bk-form-section">
        <label for="pb_search_term" class="bk-form-label">{{
          $t('importExistingPagesLabel')
        }}</label>
        <input
          id="pb_search_term"
          v-model="searchTerm"
          type="text"
          class="bk-form-input"
          :placeholder="$t('importExistingSearchPlaceholder')"
          required
        />
      </div>
      <div>
        {{
          $t('importExistingResultsTitle')
            .replace('@count', entities.length.toString())
            .replace('@total', total.toString())
        }}
      </div>
      <div
        class="bk-radio-list"
        :style="{ opacity: searchTerm !== resultsSearchTerm ? 0.5 : 1 }"
      >
        <label v-for="entity in entities" :key="entity.uuid" class="bk-radio">
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
import { watch, ref, useBlokkli, onMounted, onBeforeUnmount } from '#imports'

import { DialogModal } from '#blokkli/components'
import type { ImportItem } from '#blokkli/types'

const { adapter, $t, types, context } = useBlokkli()

const emit = defineEmits<{
  (e: 'confirm', data: { sourceUuid: string; fields: string[] }): void
  (e: 'cancel'): void
}>()

const searchTerm = ref('')
const resultsSearchTerm = ref('')
const sourceEntityUuid = ref('')
const selectedFields = ref<string[]>([])
const isLoading = ref(false)
const entities = ref<ImportItem[]>([])
const total = ref(0)

let timeout: any = null

watch(searchTerm, (newTerm) => {
  clearTimeout(timeout)

  timeout = setTimeout(() => {
    loadResults(newTerm)
  }, 300)
})

async function loadResults(userInput = '') {
  const result = await adapter.getImportItems!(userInput)
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

const fields = computed(() => {
  return types.fieldConfig.value.filter(
    (v) =>
      v.entityType === context.value.entityType &&
      v.entityBundle === context.value.entityBundle,
  )
})

onMounted(() => {
  loadResults()
})

onBeforeUnmount(() => {
  clearTimeout(timeout)
})
</script>
