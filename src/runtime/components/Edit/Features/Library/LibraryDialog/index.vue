<template>
  <FormOverlay
    id="library"
    :title="$t('libraryPlaceDialogTitle', 'Add block from library')"
    icon="reusable"
    @close="onClose"
  >
    <div class="bk-library-dialog">
      <p class="bk-lead">
        {{
          $t(
            'libraryPlaceDialogLead',
            'Select a reusable block from the library to add it to your layout. You can detach the block later.',
          )
        }}
      </p>
      <div class="bk">
        <div class="bk-form-group">
          <div>
            <label class="bk-form-label" for="library_search">
              {{ $t('libraryPlaceSearchLabel', 'Filter library items') }}
            </label>
            <input
              id="library_search"
              v-model.lazy="searchText"
              type="text"
              class="bk-form-input"
              :placeholder="
                $t('libraryPlaceSearchInputPlaceholder', 'Search library items')
              "
              required
            />
          </div>
          <div>
            <label class="bk-form-label" for="library_bundle">
              {{ $t('libraryPlaceBundleSelectLabel', 'Bundle') }}
            </label>
            <select
              id="library_bundle"
              v-model="selectedBundle"
              class="bk-form-input"
            >
              <option
                v-for="v in bundleOptions"
                :key="v.bundle"
                :value="v.bundle"
              >
                {{ v.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
      <div class="bk-library-dialog-content">
        <Loading v-if="status === 'pending'" />
        <ul ref="listEl" class="bk-library-dialog-list">
          <li
            v-for="item in items"
            :key="item.uuid"
            :class="{
              'bk-is-selected': selectedItem === item.uuid,
            }"
            @click="selectedItem = item.uuid"
          >
            <LibraryListItem v-bind="item" />
          </li>
        </ul>
      </div>
    </div>
    <div class="bk">
      <div class="bk-pagination">
        <button :disabled="page === 0" @click="page--">
          <Icon name="arrow-left" />
        </button>
        <div>{{ page + 1 }} / {{ totalPages }}</div>
        <button :disabled="page >= totalPages - 1" @click="page++">
          <Icon name="arrow-right" />
        </button>
      </div>
    </div>
    <template #footer>
      <button class="bk-button bk-is-primary" @click="onSubmit">
        {{ $t('libraryPlaceDialogSubmit', 'Add reusable block') }}
      </button>
    </template>
  </FormOverlay>
</template>

<script setup lang="ts">
import type {
  BlokkliAdapterGetLibraryItemsData,
  BlokkliAdapterGetLibraryItemsResult,
} from '#blokkli/adapter'
import { FormOverlay, Icon } from '#blokkli/components'
import Loading from './../../../Loading/index.vue'
import type { BlokkliFieldElement } from '#blokkli/types'
import { ref, useBlokkli, useAsyncData, computed, watch } from '#imports'
import LibraryListItem from './Item/index.vue'

const props = defineProps<{
  field: BlokkliFieldElement
}>()

const { $t, adapter, types } = useBlokkli()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', uuid: string): void
}>()

const searchText = ref('')
const selectedBundle = ref('all')
const listEl = ref<HTMLDivElement | null>(null)
const selectedItem = ref('')
const page = ref(0)

const allowedBundles = computed<string[]>(() => {
  return (
    types.getFieldConfig(
      props.field.hostEntityType,
      props.field.hostEntityBundle,
      props.field.name,
    )?.allowedBundles || []
  ).filter((v) => {
    return types.getBlockBundleDefinition(v)?.allowReusable
  })
})

const onSubmit = () => {
  if (selectedItem.value) {
    emit('submit', selectedItem.value)
  }
}
const onClose = () => {
  emit('close')
}

const searchParams = computed<BlokkliAdapterGetLibraryItemsData>(() => {
  return {
    bundles:
      selectedBundle.value !== 'all'
        ? [selectedBundle.value]
        : allowedBundles.value,
    page: page.value,
    text: searchText.value,
  }
})

watch(searchText, function () {
  page.value = 0
})

const { data, status } =
  await useAsyncData<BlokkliAdapterGetLibraryItemsResult>(
    () => adapter.getLibraryItems!(searchParams.value),
    {
      watch: [searchParams],
      default: () => {
        return {
          items: [],
          total: 0,
          perPage: 50,
        }
      },
    },
  )

const perPage = computed(() => data.value.perPage)
const totalPages = computed(() => Math.ceil(data.value.total / perPage.value))

const items = computed(() => data.value.items)

const bundleOptions = computed(() => {
  const bundles = allowedBundles.value.map((bundle) => {
    const definition = types.getBlockBundleDefinition(bundle)
    return {
      bundle,
      label: definition?.label || bundle,
    }
  })

  return [{ bundle: 'all', label: $t('all', 'All') }, ...bundles]
})
</script>
