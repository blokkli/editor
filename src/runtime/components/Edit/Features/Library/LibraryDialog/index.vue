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
      <div class="bk bk-library-dialog-form">
        <div class="bk-form-group">
          <div>
            <label class="bk-form-label" for="library_search">
              {{ $t('libraryPlaceSearchLabel', 'Filter library items') }}
            </label>
            <input
              id="library_search"
              v-model="searchText"
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
              @change="buildElements"
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
      <ul ref="listEl" class="bk-library-dialog-list">
        <li
          v-for="item in data"
          v-show="visible === null || visible.includes(item.uuid)"
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
    <template #footer>
      <button class="bk-button bk-is-primary" @click="onSubmit">
        {{ $t('libraryPlaceDialogSubmit', 'Add reusable block') }}
      </button>
    </template>
  </FormOverlay>
</template>

<script setup lang="ts">
import { FormOverlay } from '#blokkli/components'
import { falsy } from '#blokkli/helpers'
import type { BlokkliFieldElement, LibraryItem } from '#blokkli/types'
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

const allowedBundles = computed<string[]>(() => {
  return (
    types.fieldConfig.value.filter((v) => {
      return (
        v.name === props.field.name &&
        v.entityBundle === props.field.hostEntityBundle &&
        v.entityType === props.field.hostEntityType
      )
    })[0]?.allowedBundles || []
  )
})

const onSubmit = () => {
  if (selectedItem.value) {
    emit('submit', selectedItem.value)
  }
}
const onClose = () => {
  emit('close')
}

const { data } = await useAsyncData<LibraryItem[]>(
  () => adapter.getLibraryItems!(allowedBundles.value),
  {
    default: () => [],
  },
)

type SearchElement = {
  uuid: string
  text: string
  bundle: string
}

const elements = ref<SearchElement[]>([])

const buildElements = () => {
  if (!listEl.value || elements.value.length) {
    return
  }
  elements.value = [...listEl.value.querySelectorAll('.bk-library-list-item')]
    .map((el) => {
      if (el instanceof HTMLElement) {
        const uuid = el.dataset.libraryItemUuid
        const bundle = el.dataset.itemBundle
        if (uuid && bundle) {
          return {
            uuid,
            text: el.innerText.toLowerCase(),
            bundle,
          }
        }
      }
    })
    .filter(falsy)
}

watch(searchText, () => {
  if (!elements.value.length) {
    buildElements()
  }
})

const bundleOptions = computed(() => {
  const bundles = Object.values(
    data.value?.reduce<Record<string, { bundle: string; label: string }>>(
      (acc, item) => {
        if (!acc[item.bundle]) {
          const definition = types.getType(item.bundle)
          acc[item.bundle] = {
            bundle: item.bundle,
            label: definition?.label || item.bundle,
          }
        }
        return acc
      },
      {},
    ),
  )

  return [{ bundle: 'all', label: $t('all', 'All') }, ...bundles]
})

const visible = computed<string[] | null>(() => {
  if (searchText.value || selectedBundle.value !== 'all') {
    return elements.value
      .filter((v) => {
        if (searchText.value) {
          if (!v.text.includes(searchText.value.toLowerCase())) {
            return false
          }
        }

        if (selectedBundle.value !== 'all') {
          if (v.bundle !== selectedBundle.value) {
            return false
          }
        }

        return true
      })
      .map((v) => v.uuid)
  }
  return null
})
</script>
