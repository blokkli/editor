<template>
  <FormOverlay
    id="fragments"
    :title="$t('fragmentsPlaceDialogTitle', 'Add fragment block')"
    icon="bk_mdi_newspaper"
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
      <div class="bk">
        <div class="bk-form-group">
          <div>
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
        </div>
      </div>
      <div class="bk-library-dialog-content">
        <ul class="bk-library-dialog-list">
          <li
            v-for="(item, index) in fragments"
            v-show="visible === null || visible.includes(item.name)"
            ref="itemElements"
            :key="item.name"
            :class="{
              'bk-is-selected': selectedItem === item.name,
            }"
            :data-bk-fragment-name="item.name"
            @click="selectedItem = item.name"
          >
            <FragmentItem
              :name="item.name"
              :label="item.label"
              :description="item.description"
              :index="index"
            />
          </li>
        </ul>
      </div>
    </div>
    <template #footer>
      <button class="bk-button bk-is-primary" @click="onSubmit">
        {{ $t('fragmentsPlaceDialogSubmitButton', 'Add selected fragment') }}
      </button>
    </template>
  </FormOverlay>
</template>

<script setup lang="ts">
import { FormOverlay } from '#blokkli/editor/components'
import { falsy } from '#blokkli/helpers'
import type { BlokkliFieldElement } from '#blokkli/types'
import { ref, useBlokkli, computed, watch, useTemplateRef } from '#imports'
import FragmentItem from './Item/index.vue'

const props = defineProps<{
  field: BlokkliFieldElement
}>()

const { $t, definitions } = useBlokkli()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', uuid: string): void
}>()

const searchText = ref('')
const itemElements = useTemplateRef('itemElements')
const selectedItem = ref('')

const allowedInField = computed(() => props.field.allowedFragments || [])

const fragments = computed(() =>
  definitions.fragmentDefinitions.value.filter((v) =>
    allowedInField.value.includes(v.name),
  ),
)

const onSubmit = () => {
  if (selectedItem.value) {
    emit('submit', selectedItem.value)
  }
}
const onClose = () => {
  emit('close')
}

type SearchElement = {
  name: string
  text: string
}

const elements = ref<SearchElement[]>([])

const buildElements = () => {
  if (!itemElements.value) {
    return
  }
  elements.value = itemElements.value
    .map((el) => {
      if (el instanceof HTMLElement) {
        const name = el.dataset.bkFragmentName
        if (name) {
          return {
            name,
            text: el.textContent?.toLowerCase() || '',
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
    .map((v) => v.name)
})
</script>
