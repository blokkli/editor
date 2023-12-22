<template>
  <DialogModal
    :title="text('libraryPlaceDialogTitle')"
    :lead="text('libraryPlaceDialogLead')"
    :submit-label="text('libraryPlaceDialogSubmit')"
    :width="800"
    :can-submit="!!selectedItem"
    @submit="onSubmit"
    @cancel="onCancel"
  >
    <div class="bk-dialog-form bk-library-dialog">
      <div class="bk bk-library-dialog-form">
        <label class="bk-form-label" for="library_search">
          {{ text('libraryPlaceSearchLabel') }}
        </label>
        <input
          id="library_search"
          v-model="searchText"
          type="text"
          class="bk-form-input"
          :placeholder="text('searchInputPlaceholder')"
          required
        />
      </div>
      <ul class="bk-library-dialog-list">
        <li
          v-for="item in data"
          :key="item.uuid"
          @click="selectedItem = item.uuid"
          :class="{
            'bk-is-selected': selectedItem === item.uuid,
          }"
        >
          <LibraryItem
            v-show="visible === null || visible.includes(item.uuid)"
            :data-sortli-id="item.uuid"
            v-bind="item"
          />
        </li>
      </ul>
    </div>
  </DialogModal>
</template>

<script setup lang="ts">
import { DialogModal } from '#blokkli/components'
import { falsy } from '#blokkli/helpers'
import type { BlokkliFieldElement, BlokkliLibraryItem } from '#blokkli/types'
import { ref, useBlokkli } from '#imports'
import LibraryItem from './Item/index.vue'

const props = defineProps<{
  field: BlokkliFieldElement
}>()

const { text, adapter, types } = useBlokkli()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', uuid: string): void
}>()

const searchText = ref('')
const listEl = ref<HTMLDivElement | null>(null)
const selectedItem = ref('')

const allowedBundles = computed(() => {
  return (
    types.allowedTypes.value.filter((v) => {
      return (
        v.fieldName === props.field.name &&
        v.bundle === props.field.hostEntityBundle &&
        v.entityType === props.field.hostEntityType
      )
    })[0]?.allowedTypes || []
  )
})

const onSubmit = () => {
  if (selectedItem.value) {
    emit('submit', selectedItem.value)
  }
}
const onCancel = () => {
  emit('close')
}

const { data } = await useAsyncData<BlokkliLibraryItem[]>(() =>
  adapter.getLibraryItems(allowedBundles.value),
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

watch(text, () => {
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
