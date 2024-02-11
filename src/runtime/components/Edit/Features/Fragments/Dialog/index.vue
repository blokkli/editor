<template>
  <FormOverlay
    id="fragments"
    :title="$t('fragmentsPlaceDialogTitle', 'Add fragment block')"
    icon="reusable"
    @close="onClose"
  >
    <div class="bk-library-dialog">
      <p class="bk-lead">
        {{
          $t(
            'fragmentsPlaceDialogLead',
            'Select a block fragment to add to the page.',
          )
        }}
      </p>
      <div class="bk bk-library-dialog-form">
        <label class="bk-form-label" for="library_search">
          {{ $t('fragmentsPlaceDialogSearchLabel', 'Filter fragments') }}
        </label>
        <input
          id="fragments_search"
          v-model="searchText"
          type="text"
          class="bk-form-input"
          :placeholder="
            $t('fragmentsPlaceDialogSearchPlaceholder', 'Search fragments')
          "
          required
        />
      </div>
      <ul class="bk-library-dialog-list">
        <li
          v-for="(item, index) in fragments"
          :key="item.name"
          :class="{
            'bk-is-selected': selectedItem === item.name,
          }"
          @click="selectedItem = item.name"
        >
          <FragmentItem
            v-show="visible === null || visible.includes(item.name)"
            :name="item.name"
            :label="item.label"
            :index="index"
          />
        </li>
      </ul>
    </div>
    <template #footer>
      <button class="bk-button bk-is-primary" @click="onSubmit">
        {{ $t('fragmentsPlaceDialogSubmitButton', 'Add selected fragment') }}
      </button>
    </template>
  </FormOverlay>
</template>

<script setup lang="ts">
import { FormOverlay } from '#blokkli/components'
import { fragmentDefinitions } from '#blokkli/definitions'
import { falsy } from '#blokkli/helpers'
import type { BlokkliFieldElement } from '#blokkli/types'
import { ref, useBlokkli, computed, watch } from '#imports'
import FragmentItem from './Item/index.vue'

const props = defineProps<{
  field: BlokkliFieldElement
}>()

const { $t, types } = useBlokkli()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', uuid: string): void
}>()

const searchText = ref('')
const listEl = ref<HTMLDivElement | null>(null)
const selectedItem = ref('')

const fragments = computed(() => {
  return fragmentDefinitions
})

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
