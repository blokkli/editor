<template>
  <FormOverlay
    id="templates"
    :title="$t('templatesPlaceDialogTitle', 'Add blocks from template')"
    icon="bk_mdi_architecture"
    @close="onClose"
  >
    <div class="bk-library-dialog">
      <div class="bk">
        <InfoBox
          color="accent"
          :text="
            $t(
              'templatesPlaceDialogDescription',
              'Templates create copies of blocks that can be edited freely on this page without affecting other pages.',
            )
          "
        />
        <div v-if="config.length" class="bk-form-group">
          <ConfigForm v-model="filters" :config />
        </div>
      </div>
      <div class="bk-library-dialog-content">
        <Loading v-if="status === 'pending'" />
        <ul v-if="items.length" class="bk-library-dialog-list">
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
          {{
            $t('templatesNoResults', 'No templates available for this field.')
          }}
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
import {
  FormOverlay,
  Pagination,
  Loading,
  InfoBox,
  ConfigForm,
} from '#blokkli/editor/components'
import type { BlokkliFieldElement } from '#blokkli/editor/types/field'
import {
  ref,
  useBlokkli,
  computed,
  useAsyncData,
  reactive,
  watch,
} from '#imports'
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
const filters = reactive<Record<string, any>>({})

const host = computed(() => ({
  type: props.field.hostEntityType,
  uuid: props.field.hostEntityUuid,
  fieldName: props.field.name,
}))

const searchParams = computed<TemplatesSearchArguments>(() => ({
  host: host.value,
  page: page.value,
  filters: { ...filters },
  includeItems: true,
}))

watch(filters, function () {
  page.value = 0
})

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
const config = computed(() => data.value.filters)

const onSubmit = () => {
  if (selectedItem.value) {
    emit('submit', selectedItem.value)
  }
}
const onClose = () => {
  emit('close')
}
</script>
