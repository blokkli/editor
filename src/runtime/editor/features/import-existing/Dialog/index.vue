<template>
  <DialogModal
    id="import-existing"
    class="bk-import-existing-dialog"
    :title="$t('importExistingDialogTitle', 'Import from existing page')"
    :lead="
      $t(
        'importExistingDialogLead',
        'Import content from an existing page. The items will be added to the end of the list. This action can be undone.',
      )
    "
    :width="800"
    :submit-label="$t('importExistingDialogSubmit', 'Import content')"
    :can-submit="!!(sourceEntityUuid && selectedFields.length)"
    :is-loading="isLoading"
    @submit="onSubmit"
    @cancel="$emit('cancel')"
  >
    <div class="bk">
      <FormCheckboxes
        id="import-existing-fields"
        v-model="selectedFields"
        :label="
          $t(
            'importExistingFieldsLabel',
            'Which content would you like to import?',
          )
        "
        :options="fieldOptions"
        inline
      />
      <ConfigForm v-model="filters" :config />
      <div class="bk-import-existing-dialog-results">
        <div class="bk-form-label">
          {{ $t('importExistingPagesTitle', 'Select page') }}
        </div>
        <label v-for="item in items" :key="item.uuid" class="bk-radio">
          <input
            v-model="sourceEntityUuid"
            type="radio"
            :value="item.uuid"
            name="entity"
          />
          <span>{{ item.label }}</span>
          <div v-if="item.description" class="bk-radio-description">
            {{ item.description }}
          </div>
        </label>
      </div>
    </div>
    <template #pre-footer>
      <Pagination v-model="page" :total-pages />
    </template>
  </DialogModal>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli, useAsyncData, watch } from '#imports'
import {
  DialogModal,
  ConfigForm,
  Pagination,
  FormCheckboxes,
} from '#blokkli/editor/components'
import type { AdapterSearchArguments } from '#blokkli/editor/adapter'
import type { ImportItem } from '../types'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'

const { adapter, $t, types, context } = useBlokkli()

const emit = defineEmits<{
  (e: 'confirm', data: { sourceUuid: string; fields: string[] }): void
  (e: 'cancel'): void
}>()

const sourceEntityUuid = ref('')
const selectedFields = ref<string[]>([])
const isLoading = ref(false)
const page = ref(0)
const filters = ref<Record<string, any>>({})

watch(
  () => ({ ...filters.value }),
  () => {
    page.value = 0
  },
)

const args = computed<AdapterSearchArguments>(() => {
  return {
    page: page.value,
    filters: { ...filters.value },
  }
})

const { data } = useAsyncData(
  () => {
    return adapter.getImportItems!(args.value)
  },
  {
    watch: [args],
  },
)

const items = computed<ImportItem[]>(() => data.value?.items ?? [])
const config = computed<PluginConfigInput[]>(() => data.value?.filters ?? [])
const total = computed(() => data.value?.total ?? 0)
const perPage = computed(() => data.value?.perPage ?? 16)

const totalPages = computed(() => {
  return Math.ceil(total.value / perPage.value)
})

function onSubmit() {
  emit('confirm', {
    sourceUuid: sourceEntityUuid.value,
    fields: selectedFields.value,
  })
  isLoading.value = true
}

const fieldOptions = computed(() =>
  types.fieldConfig
    .forEntityTypeAndBundle(
      context.value.entityType,
      context.value.entityBundle,
    )
    .map((field) => {
      return {
        value: field.name,
        label: field.label,
      }
    }),
)
</script>

<style lang="postcss">
.bk.bk-import-existing-dialog {
  .bk.bk-dialog-footer {
    @apply mt-0;
  }
  .bk-dialog-pre-footer {
    @apply p-0 bg-white;
  }
  .bk-import-existing-dialog-results {
    @apply mt-15 pt-15 border-t border-t-mono-300;
  }
}
</style>
