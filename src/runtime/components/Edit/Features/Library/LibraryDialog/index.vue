<template>
  <FormOverlay
    id="library"
    :title="$t('libraryPlaceDialogTitle', 'Add block from library')"
    icon="reusable"
    @close="onClose"
  >
    <div class="bk-library-dialog">
      <div>
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
            <ConfigForm v-model="filters" :config />
            <FormItem>
              <FormSelect
                id="library_bundle"
                v-model="selectedBundle"
                :label="$t('libraryPlaceBundleSelectLabel', 'Bundle')"
                :options="bundleOptions"
              />
            </FormItem>
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
      <div class="bk bk-library-pagination">
        <Pagination v-model="page" :total-pages />
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
} from '#blokkli/editor/adapter'
import {
  FormOverlay,
  Pagination,
  FormItem,
  FormSelect,
  ConfigForm,
} from '#blokkli/components'
import Loading from './../../../Loading/index.vue'
import type { BlokkliFieldElement, FieldConfig } from '#blokkli/types'
import {
  ref,
  useBlokkli,
  useAsyncData,
  computed,
  watch,
  reactive,
} from '#imports'
import LibraryListItem from './Item/index.vue'

const props = defineProps<{
  field: BlokkliFieldElement
}>()

const { $t, adapter, types } = useBlokkli()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', uuid: string): void
}>()

const filters = reactive<Record<string, any>>({})
const selectedBundle = ref('all')
const selectedItem = ref('')
const page = ref(0)

const allowedBundles = computed<string[]>(() => {
  const fieldConfig: FieldConfig | undefined = types.getFieldConfig(
    props.field.hostEntityType,
    props.field.hostEntityBundle,
    props.field.name,
  )
  return (fieldConfig?.allowedBundles || []).filter((v) => {
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
    filters: { ...filters },
  }
})

watch(filters, function () {
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
          filters: [],
          total: 0,
          perPage: 50,
        }
      },
    },
  )

const perPage = computed(() => data.value.perPage)
const totalPages = computed(() => Math.ceil(data.value.total / perPage.value))

const config = computed(() => data.value.filters)

const items = computed(() => data.value.items)

const bundleOptions = computed(() => {
  const bundles = allowedBundles.value.map((bundle) => {
    const definition = types.getBlockBundleDefinition(bundle)
    return {
      value: bundle,
      label: definition?.label || bundle,
    }
  })

  return [{ value: 'all', label: $t('all', 'All') }, ...bundles]
})
</script>
