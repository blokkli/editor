<template>
  <DialogModal
    id="translations-translate"
    :title="$t('translationsTranslateDialogTitle', 'Automatic Translation')"
    icon="bk_mdi_translate"
    :width="1800"
    hide-buttons
    @cancel="$emit('close')"
  >
    <div class="bk h-[calc(100vh-200px)] overflow-hidden flex flex-col">
      <template v-if="isLoading">
        <div class="flex items-center justify-center py-60">
          <Loading />
        </div>
      </template>

      <template v-else-if="!sourceValues.length">
        <div class="py-20 text-center text-mono-500">
          {{
            $t(
              'translationsTranslateNoTexts',
              'No translatable texts found on this page.',
            )
          }}
        </div>
      </template>

      <template v-else>
        <SelectionTable
          v-model:only-outdated="onlyOutdated"
          v-model:only-untranslated="onlyUntranslated"
          show-filters
          show-selection
          :selected-count="selectedCount"
          :total-count="filteredValues.length"
          :label="$t('translationsTranslateFieldsLabel', 'fields selected')"
          @toggle-all="toggleAll"
        >
          <template #header>
            <th>{{ sourceLangName }}</th>
            <th v-if="hasTranslated">
              {{ targetLangName }}
            </th>
            <th v-else>
              {{
                $t(
                  'translationsTranslateCurrentColumn',
                  'Current translation (@language)',
                ).replace('@language', targetLangName)
              }}
            </th>
          </template>
          <template #body>
            <tr v-for="item in filteredValues" :key="item.key">
              <td>
                <div class="bk-checkbox">
                  <input
                    type="checkbox"
                    :checked="selected[item.key]"
                    @change="selected[item.key] = !selected[item.key]"
                  />
                  <span class="!mt-0 before:!mt-0" />
                </div>
              </td>
              <td v-text="stripHtml(item.value)" />
              <td v-if="hasTranslated && translations.has(item.key)">
                <DiffValue
                  :before="currentValues.get(item.key) || ''"
                  :after="translations.get(item.key) || ''"
                  :after-only="
                    !currentValues.get(item.key) ||
                    currentValues.get(item.key) === item.value
                  "
                />
              </td>
              <td v-else>
                <span
                  v-if="
                    currentValues.get(item.key) &&
                    currentValues.get(item.key) !== item.value
                  "
                  v-text="stripHtml(currentValues.get(item.key)!)"
                />
                <span v-else class="text-mono-400 italic">&mdash;</span>
              </td>
            </tr>
          </template>
        </SelectionTable>

        <div class="flex items-center gap-10 mt-auto pt-20">
          <button
            class="bk-button"
            :disabled="!selectedCount || isTranslating"
            @click="requestTranslations"
          >
            <template v-if="isTranslating">
              {{ $t('translationsTranslateLoading', 'Translating...') }}
            </template>
            <template v-else>
              {{
                $t(
                  'translationsTranslateButton',
                  'Request @count translations',
                ).replace('@count', selectedCount.toString())
              }}
            </template>
          </button>
          <button
            class="bk-button bk-scheme-accent"
            :disabled="!hasTranslated || !selectedCount || isApplying"
            @click="applyTranslations"
          >
            {{
              $t(
                'translationsTranslateApply',
                'Apply @count translations',
              ).replace('@count', selectedCount.toString())
            }}
          </button>
          <FormToggle
            v-model="markUpToDate"
            class="!h-auto"
            :label="
              $t('translationsMarkUpToDate', 'Mark translations as up to date')
            "
          />
        </div>
      </template>

      <div
        v-if="errorMessage"
        class="text-red-normal text-sm"
        v-text="errorMessage"
      />
    </div>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted } from '#imports'
import {
  DialogModal,
  DiffValue,
  FormToggle,
  Loading,
} from '#blokkli/editor/components'
import type { TextFieldValue } from '#blokkli/editor/providers/fieldValue'
import SelectionTable from '../SelectionTable/index.vue'

const emit = defineEmits<{
  close: []
}>()

const { adapter, $t, state, context, blocks } = useBlokkli()

type SourceItem = TextFieldValue & { key: string }

const sourceValues = ref<SourceItem[]>([])
const currentValues = ref<Map<string, string>>(new Map())
const translations = ref<Map<string, string>>(new Map())
const selected = ref<Record<string, boolean>>({})
const isLoading = ref(true)
const isTranslating = ref(false)
const isApplying = ref(false)
const hasTranslated = ref(false)
const markUpToDate = ref(false)
const errorMessage = ref('')
const onlyOutdated = ref(false)
const onlyUntranslated = ref(false)

const sourceLanguage = computed(
  () => state.translation.value.sourceLanguage || 'en',
)
const targetLanguage = computed(() => context.value.language)

const outdatedUuids = computed(() => {
  const lang = targetLanguage.value
  return new Set(
    blocks
      .getAllBlocks()
      .filter((b) => b.outdatedTranslations.includes(lang))
      .map((b) => b.uuid),
  )
})

const filteredValues = computed(() => {
  let items = sourceValues.value

  if (onlyOutdated.value) {
    items = items.filter((item) => outdatedUuids.value.has(item.uuid))
  }

  if (onlyUntranslated.value) {
    items = items.filter((item) => {
      const current = currentValues.value.get(item.key)
      return !current || current === item.value
    })
  }

  return items
})

const selectedCount = computed(
  () => filteredValues.value.filter((item) => selected.value[item.key]).length,
)

const sourceLangName = computed(() => {
  const id = sourceLanguage.value
  return (
    state.translation.value.availableLanguages?.find((l) => l.id === id)
      ?.name ?? id
  )
})

const targetLangName = computed(() => {
  const id = targetLanguage.value
  return (
    state.translation.value.availableLanguages?.find((l) => l.id === id)
      ?.name ?? id
  )
})

function toggleAll() {
  const allSelected =
    filteredValues.value.length > 0 &&
    selectedCount.value === filteredValues.value.length
  const newValue = !allSelected
  for (const item of filteredValues.value) {
    selected.value[item.key] = newValue
  }
}

function stripHtml(text: string): string {
  const div = document.createElement('div')
  div.innerHTML = text
  return div.textContent || ''
}

async function loadTexts() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const source = await adapter.loadTextFieldValuesForLanguage!(
      sourceLanguage.value,
    )
    sourceValues.value = source.map((v) => ({
      ...v,
      key: `${v.uuid}:${v.fieldName}`,
    }))

    // Select all by default.
    for (const item of sourceValues.value) {
      selected.value[item.key] = true
    }

    // Load current translation values.
    const current = await adapter.loadTextFieldValuesForLanguage!(
      targetLanguage.value,
    )
    const map = new Map<string, string>()
    for (const v of current) {
      map.set(`${v.uuid}:${v.fieldName}`, v.value)
    }
    currentValues.value = map
  } catch (e: any) {
    errorMessage.value = e?.message || 'Failed to load texts.'
  } finally {
    isLoading.value = false
  }
}

async function requestTranslations() {
  isTranslating.value = true
  errorMessage.value = ''

  const items = filteredValues.value
    .filter((item) => selected.value[item.key])
    .map((item) => ({
      key: item.key,
      text: item.value,
      isHtml: item.fieldType === 'markup',
      sourceLanguage: sourceLanguage.value,
      targetLanguage: targetLanguage.value,
    }))

  try {
    const response = await adapter.requestTranslation!(items)
    if (!response.success) {
      errorMessage.value =
        response.errors?.join(', ') || 'Translation request failed.'
      return
    }
    const map = new Map<string, string>()
    for (const result of response.data) {
      map.set(result.key, result.translatedText)
    }
    translations.value = map
    hasTranslated.value = true
  } catch (e: any) {
    errorMessage.value = e?.message || 'Translation request failed.'
  } finally {
    isTranslating.value = false
  }
}

async function applyTranslations() {
  isApplying.value = true
  errorMessage.value = ''

  const items = filteredValues.value
    .filter(
      (item) => selected.value[item.key] && translations.value.has(item.key),
    )
    .map((item) => {
      const separatorIndex = item.key.indexOf(':')
      return {
        langcode: targetLanguage.value,
        uuid: item.key.substring(0, separatorIndex),
        fieldName: item.key.substring(separatorIndex + 1),
        fieldValue: translations.value.get(item.key)!,
      }
    })

  if (!items.length) return

  try {
    await state.mutateWithLoadingState(() =>
      adapter.importTranslationsBatched!({
        items,
        markUpToDate: markUpToDate.value,
      }),
    )
    emit('close')
  } catch (e: any) {
    errorMessage.value = e?.message || 'Failed to apply translations.'
  } finally {
    isApplying.value = false
  }
}

onMounted(() => {
  loadTexts()
})
</script>
