<template>
  <PbDialog
    :title="title"
    :lead="lead"
    :width="600"
    :submitLabel="submitLabel"
    :can-submit="!!(sourceEntityUuid && selectedFields.length)"
    :is-loading="isLoading"
    @submit="onSubmit"
    @cancel="$emit('cancel')"
  >
    <div class="pb pb-dialog-form">
      <div class="pb-form-section">
        <h3 class="pb-form-label">Welche Inhalte möchten Sie importieren?</h3>
        <label v-for="field in mutatedFields" class="pb-checkbox">
          <input v-model="selectedFields" type="checkbox" :value="field.name" />
          <span>{{ field.label }}</span>
        </label>
      </div>
      <div class="pb-form-section">
        <label for="pb_search_term" class="pb-form-label"
          >Von welcher Seite möchten Sie importieren?</label
        >
        <input
          v-model="searchTerm"
          type="text"
          id="pb_search_term"
          class="pb-form-input"
          placeholder="Seiten durchsuchen"
          required
        />
      </div>
      <div>{{ entities.length }} von {{ total }} Seiten</div>
      <div
        class="pb-radio-list"
        :style="{ opacity: searchTerm !== resultsSearchTerm ? 0.5 : 1 }"
      >
        <label v-for="entity in entities" class="pb-radio">
          <input
            v-model="sourceEntityUuid"
            type="radio"
            :value="entity.uuid"
            name="entity"
          />
          <span>{{ entity.label }}</span>
        </label>
      </div>
    </div>
  </PbDialog>
</template>

<script lang="ts" setup>
import PbDialog from './../../../Dialog/index.vue'
import { EntityQueryOperator, EntityType } from '#build/graphql-operations'
import { falsy } from '../../../helpers'

const { entityType, entityUuid, entityBundle, mutatedFields } =
  useParagraphsBuilderStore()

interface ExistingEntity {
  id: string
  uuid: string
  label: string
  search: string
}

const emit = defineEmits<{
  (e: 'confirm', data: { sourceUuid: string; fields: string[] }): void
  (e: 'cancel'): void
}>()

const title = 'Von bestehender Seite importieren'
const lead =
  'Importieren Sie Inhalte von einer bestehenden Seite. Die Paragraphen werden an das Ende der Liste hinzugefügt. Diese Aktion kann rückgängig gemacht werden.'
const submitLabel = 'Inhalte importieren'

const searchTerm = ref('')
const resultsSearchTerm = ref('')
const sourceEntityUuid = ref('')
const selectedFields = ref<string[]>([])
const isLoading = ref(false)
const entities = ref<ExistingEntity[]>([])
const total = ref(0)

let timeout: any = null

watch(searchTerm, (newTerm) => {
  clearTimeout(timeout)

  timeout = setTimeout(() => {
    loadResults(newTerm)
  }, 300)
})

async function loadResults(userInput = '') {
  const text = `%${userInput}%`
  const { data } = await useGraphqlQuery('paragraphsBuilderExisting', {
    entityType: entityType.toUpperCase() as EntityType,
    entityUuid: entityUuid,
    bundle: entityBundle,
    bundleField: entityType === 'taxonomy_term' ? 'vid' : 'type',
    titleField: entityType === 'taxonomy_term' ? 'name' : 'title',
    conditions: mutatedFields.value.map((v) => {
      return {
        field: v.name,
        operator: 'IS_NOT_NULL' as EntityQueryOperator,
      }
    }),
    text,
  })

  const items =
    data.entityQuery.items
      ?.map((v) => {
        if (v.label && v.uuid && v.id) {
          return {
            id: v.id,
            uuid: v.uuid,
            label: v.label,
            search: v.label.toLowerCase(),
          }
        }
        return null
      })
      .filter(falsy) || []

  items.sort((a, b) => a.search.localeCompare(b.search))

  entities.value = items
  total.value = data.entityQuery.total || 0
  resultsSearchTerm.value = userInput
}

function onSubmit() {
  emit('confirm', {
    sourceUuid: sourceEntityUuid.value,
    fields: selectedFields.value,
  })
  isLoading.value = true
}

onMounted(() => {
  loadResults()
})

onBeforeUnmount(() => {
  clearTimeout(timeout)
})
</script>
