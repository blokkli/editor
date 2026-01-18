<template>
  <FormOverlay
    id="templates"
    :title="$t('templatesPlaceDialogTitle', 'Add blocks from template')"
    icon="bk_mdi_architecture"
    @close="onClose"
  >
    <div class="bk-library-dialog">
      <p class="bk-lead">
        {{
          $t(
            'templatesPlaceDialogLead',
            'Select a template to add multiple blocks to your layout.',
          )
        }}
      </p>
      <div class="bk-library-dialog-content">
        <Loading v-if="status === 'pending'" />
        <ul v-else-if="items.length" class="bk-library-dialog-list">
          <li
            v-for="item in items"
            :key="item.uuid"
            :class="{
              'bk-is-selected': selectedItem === item.uuid,
            }"
            @click="selectedItem = item.uuid"
          >
            <TemplateItem v-bind="item" />
          </li>
        </ul>
        <p v-else class="bk-lead">
          {{ $t('templatesNoResults', 'No templates available for this field.') }}
        </p>
      </div>
      <div v-if="totalPages > 1" class="bk bk-library-pagination">
        <Pagination v-model="page" :total-pages />
      </div>
    </div>
    <template #footer>
      <button
        class="bk-button bk-is-primary"
        :disabled="!selectedItem"
        @click="onSubmit"
      >
        {{ $t('templatesPlaceDialogSubmitButton', 'Add template blocks') }}
      </button>
    </template>
  </FormOverlay>
</template>

<script setup lang="ts">
import { FormOverlay, Pagination, Loading } from '#blokkli/editor/components'
import type { BlokkliFieldElement } from '#blokkli/editor/types/field'
import { ref, useBlokkli, computed, useAsyncData } from '#imports'
import TemplateItem from './Item/index.vue'
import type {
  AdapterTemplatesGetResult,
  TemplatesSearchArguments,
} from '../types'

const props = defineProps<{
  field: BlokkliFieldElement
}>()

const { $t, adapter } = useBlokkli()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', uuid: string): void
}>()

const selectedItem = ref('')
const page = ref(0)

const host = computed(() => ({
  type: props.field.hostEntityType,
  uuid: props.field.hostEntityUuid,
  fieldName: props.field.name,
}))

const searchParams = computed<TemplatesSearchArguments>(() => ({
  host: host.value,
  page: page.value,
  filters: {},
}))

const { data, status } = await useAsyncData<AdapterTemplatesGetResult>(
  () => adapter.templatesSearch!(searchParams.value),
  {
    watch: [searchParams],
    default: () => ({
      items: [],
      filters: [],
      total: 0,
      perPage: 10,
    }),
  },
)

const perPage = computed(() => data.value.perPage)
const totalPages = computed(() => Math.ceil(data.value.total / perPage.value))
const items = computed(() => data.value.items)

const onSubmit = () => {
  if (selectedItem.value) {
    emit('submit', selectedItem.value)
  }
}
const onClose = () => {
  emit('close')
}
</script>
