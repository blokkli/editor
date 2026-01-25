<template>
  <DialogModal
    id="templates-manage"
    :title="$t('templatesManageDialogTitle', 'Manage templates')"
    :lead="
      $t(
        'templatesManageDialogLead',
        'View, edit and delete your block templates.',
      )
    "
    :width="1200"
    icon="bk_mdi_dashboard"
    hide-buttons
    @cancel="$emit('cancel')"
  >
    <div ref="dialogEl" class="bk-templates-manage">
      <div v-if="config.length" class="bk-form-group">
        <ConfigForm v-model="filters" :config />
      </div>
      <Loading v-if="status === 'pending'" />
      <template v-if="items.length">
        <table class="bk-table">
          <thead>
            <tr>
              <th>
                {{ $t('nameDescription', 'Name / Description') }}
              </th>
              <th>
                {{ $t('createdBy', 'Created by') }}
              </th>
              <th>
                {{ $t('created', 'Created') }}
              </th>
              <th>
                {{ $t('dateUpdated', 'Updated') }}
              </th>
              <th>
                {{ $t('actions', 'Actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <TabelRow
              v-for="item in items"
              :key="item.uuid"
              v-bind="item"
              @refresh="refresh"
            />
          </tbody>
        </table>
        <div v-if="totalPages > 1">
          <Pagination v-model="page" :total-pages />
        </div>
      </template>
      <p v-else class="bk-lead">
        {{ $t('templatesManageDialogNoResults', 'No templates found.') }}
      </p>
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import {
  ref,
  useBlokkli,
  computed,
  useAsyncData,
  watch,
  reactive,
} from '#imports'
import {
  DialogModal,
  Pagination,
  Loading,
  ConfigForm,
} from '#blokkli/editor/components'
import type {
  AdapterTemplatesGetResult,
  TemplatesSearchArguments,
} from '../types'
import TabelRow from './Item.vue'

defineEmits<{
  (e: 'cancel'): void
}>()

const { $t, adapter } = useBlokkli()

const page = ref(0)
const confirmDeleteUuid = ref('')
const filters = reactive<Record<string, any>>({})

const searchParams = computed<TemplatesSearchArguments>(() => ({
  page: page.value,
  filters: { ...filters },
  includeItems: false,
}))

const { data, status, refresh } = await useAsyncData<AdapterTemplatesGetResult>(
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

watch(page, () => {
  confirmDeleteUuid.value = ''
})
</script>
