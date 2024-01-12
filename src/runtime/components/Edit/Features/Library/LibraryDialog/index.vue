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
      <ul class="bk-library-dialog-list">
        <li
          v-for="item in data"
          :key="item.uuid"
          :class="{
            'bk-is-selected': selectedItem === item.uuid,
          }"
          @click="selectedItem = item.uuid"
        >
          <LibraryListItem
            v-show="visible === null || visible.includes(item.uuid)"
            :data-sortli-id="item.uuid"
            v-bind="item"
          />
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

const { data } = await useAsyncData<LibraryItem[]>(() =>
  adapter.getLibraryItems!(allowedBundles.value),
)

type SearchElement = {
  uuid: string
  text: string
}

const elements = ref<SearchElement[]>([])

const buildElements = () => {
  if (!listEl.value) {
    return
  }
  elements.value = [...listEl.value.querySelectorAll('.bk-library-list-item')]
    .map((el) => {
      if (el instanceof HTMLElement) {
        const uuid = el.dataset.libraryItemUuid
        if (uuid) {
          return {
            uuid,
            text: el.innerText.toLowerCase(),
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

const visible = computed<string[] | null>(() => {
  if (!searchText.value || !elements.value.length) {
    return null
  }

  return elements.value
    .filter((v) => v.text.includes(searchText.value.toLowerCase()))
    .map((v) => v.uuid)
})
</script>
