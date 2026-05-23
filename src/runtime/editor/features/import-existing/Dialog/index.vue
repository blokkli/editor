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
    :submit-label="$t('importExistingDialogSubmit', 'Import content')"
    :can-submit
    :is-loading="isLoading || workspaces.isLoading.value || isSearching"
    mono
    @submit="onSubmit"
    @cancel="$emit('cancel')"
  >
    <PanelSection
      v-if="fieldOptions.length > 1"
      padded
      :title="
        $t(
          'importExistingFieldsLabel',
          'Which content would you like to import?',
        )
      "
    >
      <FormCheckboxes
        id="import-existing-fields"
        v-model="selectedFields"
        :options="fieldOptions"
        inline
      />
    </PanelSection>
    <PanelSection padded :title="$t('selectPage', 'Select page')">
      <FormItem>
        <FormText
          id="import-existing-search"
          v-model="searchText"
          :placeholder="
            $t('importExistingSearchPlaceholder', 'Search pages', {
              more: true,
            })
          "
        />
      </FormItem>
      <FormItem>
        <GrowOnly>
          <div
            v-if="!pagedItems.length && !workspaces.isLoading.value"
            class="py-20 text-center text-mono-500 text-sm"
          >
            {{ $t('importExistingNoResults', 'No pages found.') }}
          </div>
          <div class="grid gap-10">
            <Item
              v-for="item in pagedItems"
              :key="item.uuid"
              v-model:selected-uuid="sourceEntityUuid"
              v-bind="item"
              :bundle-label="workspaces.getBundleLabel(item.bundle)"
              :is-owner="!!(item.uid && item.uid === ownerId)"
            />
          </div>
        </GrowOnly>
      </FormItem>

      <Pagination v-if="totalPages > 1" v-model="page" :total-pages />
    </PanelSection>
  </DialogModal>
</template>

<script lang="ts" setup>
import {
  computed,
  ref,
  useBlokkli,
  watch,
  onMounted,
  onBeforeUnmount,
} from '#imports'
import {
  DialogModal,
  Pagination,
  FormCheckboxes,
  FormText,
  GrowOnly,
  FormItem,
} from '#blokkli/editor/components'
import Item from './Item.vue'
import type { HostEntitySearchResultItem } from '#blokkli/editor/providers/workspaces'
import type { FieldConfig } from '#blokkli/editor/types/definitions'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'

const { $t, context, state, workspaces } = useBlokkli()

const props = defineProps<{
  fields: FieldConfig[]
}>()

const emit = defineEmits<{
  (e: 'confirm', data: { sourceUuid: string; fields: string[] }): void
  (e: 'cancel'): void
}>()

const fieldOptions = computed(() =>
  props.fields.map((field) => {
    return {
      value: field.name,
      label: field.label,
    }
  }),
)

const sourceEntityUuid = ref('')

const selectedFields = ref<string[]>([])
const isLoading = ref(false)
const page = ref(0)
const searchText = ref('')
const fzfResults = ref<HostEntitySearchResultItem[]>([])
const isSearching = ref(false)

const ownerId = computed(() => state.owner.value?.id)
const currentBundle = computed(() => context.value.entityBundle)

const canSubmit = computed(() => {
  return !!(sourceEntityUuid.value && selectedFields.value.length)
})

const sortedItems = computed<HostEntitySearchResultItem[]>(() =>
  searchText.value.trim() ? fzfResults.value : workspaces.defaultSorted.value,
)

const filteredItems = computed<HostEntitySearchResultItem[]>(() =>
  sortedItems.value.filter((item) => item.bundle === currentBundle.value),
)

const perPage = 16
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / perPage)),
)

const pagedItems = computed<HostEntitySearchResultItem[]>(() =>
  filteredItems.value.slice(page.value * perPage, (page.value + 1) * perPage),
)

watch(searchText, () => {
  page.value = 0
})

// Debounced search.
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(searchText, (newValue) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
    searchTimeout = null
  }

  if (!newValue.trim()) {
    fzfResults.value = []
    isSearching.value = false
    return
  }

  isSearching.value = true
  const query = newValue.trim()

  searchTimeout = setTimeout(async () => {
    if (searchText.value.trim() !== query) {
      isSearching.value = false
      return
    }
    try {
      const results = await workspaces.search(query)
      if (searchText.value.trim() === query) {
        fzfResults.value = results
      }
    } finally {
      if (searchText.value.trim() === query) {
        isSearching.value = false
      }
    }
  }, 150)
})

function onSubmit() {
  emit('confirm', {
    sourceUuid: sourceEntityUuid.value,
    fields: selectedFields.value,
  })
  isLoading.value = true
}

onMounted(async () => {
  await workspaces.ensureLoaded()
  selectedFields.value = fieldOptions.value.map((v) => v.value)
})

onBeforeUnmount(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>

<style lang="postcss">
.bk.bk-import-existing-dialog {
  .bk.bk-dialog-footer {
    @apply mt-0;
  }
  .bk-dialog-pre-footer {
    @apply p-0 bg-white;
  }
}
</style>
