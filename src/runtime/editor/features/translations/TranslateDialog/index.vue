<template>
  <DialogModal
    id="translations-translate"
    :title="$t('translationsTranslateDialogTitle', 'Translate texts')"
    icon="bk_mdi_translate"
    :width="1800"
    mono
    @cancel="$emit('close')"
  >
    <PanelSection
      v-if="!isLoading && sourceValues.length"
      :title="$t('filter', 'Filter')"
      padded
    >
      <div class="flex items-center gap-20">
        <FormToggle
          v-model="onlyOutdated"
          :label="
            $t('translationsCsvOnlyOutdated', 'Only outdated translations')
          "
        />
        <FormToggle
          v-model="onlyUntranslated"
          :label="$t('translationsCsvOnlyMissing', 'Only missing translations')"
        />
      </div>
    </PanelSection>

    <PanelSection
      data-test="translations-batch-fields"
      :title="sourceValues.length ? fieldsTitle : undefined"
      sticky-actions
    >
      <div v-if="isLoading" class="flex items-center justify-center py-60">
        <Loading />
      </div>

      <div
        v-else-if="!sourceValues.length"
        data-test="translations-batch-empty"
        class="py-20 text-center text-mono-500"
      >
        {{
          $t(
            'translationsTranslateNoTexts',
            'No translatable texts found on this page.',
          )
        }}
      </div>

      <SelectionTable
        v-else
        show-selection
        :selected-count="selectedCount"
        :total-count="filteredValues.length"
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
          <tr
            v-for="item in filteredValues"
            :key="item.key"
            data-test="translations-batch-row"
            :data-test-key="item.key"
          >
            <td>
              <div class="bk-checkbox">
                <input
                  type="checkbox"
                  data-test="translations-batch-row-checkbox"
                  :checked="selected[item.key]"
                  @change="selected[item.key] = !selected[item.key]"
                />
                <span class="!mt-0 before:!mt-0" />
              </div>
            </td>
            <td v-text="stripHtml(item.value)" />
            <td
              class="bk-has-row-actions"
              :class="{ 'bk-is-editing': editingKey === item.key }"
            >
              <Editor
                v-if="editingKey === item.key"
                :uuid="item.uuid"
                :field-name="item.fieldName"
                :entity-type="item.entityType"
                :entity-bundle="item.entityBundle"
                :seed="editorSeed"
                :config-type="editorConfigType"
                @save="onEditorSave(item, $event)"
                @cancel="editingKey = null"
              />
              <div v-else class="flex items-start gap-10">
                <div class="flex-1 min-w-0">
                  <DiffValue
                    v-if="effectiveValue(item) !== undefined"
                    :before="currentValues.get(item.key) || ''"
                    :after="effectiveValue(item)!"
                    :after-only="
                      !currentValues.get(item.key) ||
                      currentValues.get(item.key) === item.value
                    "
                  />
                  <span
                    v-else-if="
                      currentValues.get(item.key) &&
                      currentValues.get(item.key) !== item.value
                    "
                    v-text="stripHtml(currentValues.get(item.key)!)"
                  />
                  <span v-else class="text-mono-400 italic">&mdash;</span>
                </div>
                <div class="flex items-center gap-5 shrink-0 relative">
                  <Pill
                    v-if="editedTranslations.has(item.key)"
                    data-test="translations-batch-edited"
                    :text="$t('translationsEditedManually', 'Manually edited')"
                  />
                  <ButtonAction
                    v-if="editedTranslations.has(item.key)"
                    icon="bk_mdi_undo"
                    data-test="translations-batch-edit-reset"
                    :label="
                      $t('translationsEditReset', 'Discard manual translation')
                    "
                    @click="editedTranslations.delete(item.key)"
                  />
                  <ButtonAction
                    v-if="
                      !editedTranslations.has(item.key) &&
                      translations.has(item.key) &&
                      !discardedProposals.has(item.key)
                    "
                    icon="bk_mdi_close"
                    data-test="translations-batch-discard"
                    :label="
                      $t('translationsDiscardProposal', 'Discard suggestion')
                    "
                    @click="discardedProposals.add(item.key)"
                  />
                  <ButtonAction
                    v-if="
                      !editedTranslations.has(item.key) &&
                      discardedProposals.has(item.key)
                    "
                    icon="bk_mdi_undo"
                    data-test="translations-batch-restore"
                    :label="
                      $t('translationsRestoreProposal', 'Restore suggestion')
                    "
                    @click="discardedProposals.delete(item.key)"
                  />
                  <ButtonAction
                    v-if="editConfigFor(item)"
                    icon="bk_mdi_edit"
                    data-test="translations-batch-edit"
                    :label="$t('editTranslation', 'Edit translation')"
                    @click="openEditor(item)"
                  />
                </div>
              </div>
            </td>
          </tr>
        </template>
      </SelectionTable>

      <template v-if="!isLoading && sourceValues.length" #actions>
        <PanelAction
          data-test="translations-batch-request"
          icon="bk_mdi_translate"
          :disabled="!selectedCount || isTranslating"
          :title="requestButtonLabel"
          @click="requestTranslations"
        />
      </template>
    </PanelSection>

    <template v-if="errorMessage" #pre-footer>
      <div class="text-red-normal text-sm" v-text="errorMessage" />
    </template>

    <template #footer>
      <button
        class="bk-button bk-scheme-accent"
        data-test="translations-batch-apply"
        :disabled="!pendingCount || isApplying"
        @click="applyTranslations"
      >
        {{ $t('apply', 'Apply') }}
      </button>
      <FormToggle
        v-model="markUpToDate"
        class="!h-auto"
        :label="$t('translationsMarkUpToDate', 'Mark as up-to-date')"
      />
    </template>
  </DialogModal>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted } from '#imports'
import {
  ButtonAction,
  DialogModal,
  DiffValue,
  FormToggle,
  Loading,
  Pill,
} from '#blokkli/editor/components'
import type { TextFieldValue } from '#blokkli/editor/providers/fieldValue'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import PanelAction from '#blokkli/editor/components/Panel/Action/index.vue'
import SelectionTable from '../SelectionTable/index.vue'
import Editor from './Editor/index.vue'

const emit = defineEmits<{
  close: []
}>()

const { adapter, $t, state, context, blocks, types } = useBlokkli()

type SourceItem = TextFieldValue & { key: string }

const sourceValues = ref<SourceItem[]>([])
const currentValues = ref<Map<string, string>>(new Map())
const translations = ref<Map<string, string>>(new Map())
const editedTranslations = ref<Map<string, string>>(new Map())
const discardedProposals = ref<Set<string>>(new Set())
const editingKey = ref<string | null>(null)
const editorSeed = ref('')
const editorConfigType = ref<'plain' | 'frame'>('plain')
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

/**
 * A current value that is absent or identical to the source text is the
 * untranslated fallback, not a real translation.
 */
function isMissingTranslation(item: SourceItem): boolean {
  const current = currentValues.value.get(item.key)
  return !current || current === item.value
}

const filteredValues = computed(() => {
  let items = sourceValues.value

  if (onlyOutdated.value) {
    items = items.filter((item) => outdatedUuids.value.has(item.uuid))
  }

  if (onlyUntranslated.value) {
    items = items.filter(isMissingTranslation)
  }

  return items
})

const selectedCount = computed(
  () => filteredValues.value.filter((item) => selected.value[item.key]).length,
)

const fieldsTitle = computed(
  () =>
    `${selectedCount.value}/${filteredValues.value.length} ` +
    $t('translationsTranslateFieldsLabel', 'fields selected'),
)

/**
 * Pending changes over ALL rows, ignoring the display filters — a manual
 * edit on a filtered-out row must still be applied.
 */
const pendingCount = computed(
  () =>
    sourceValues.value.filter((item) => effectiveValue(item) !== undefined)
      .length,
)

const requestButtonLabel = computed(() => {
  if (isTranslating.value) {
    return $t('translationsTranslateLoading', 'Translating', { more: true })
  }
  return $t(
    'translationsTranslateButton',
    'Auto-translate @count fields',
  ).replace('@count', selectedCount.value.toString())
})

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

/**
 * The value that would land on apply: manual edit first, then the proposal
 * unless it was discarded.
 */
function effectiveValue(item: SourceItem): string | undefined {
  const edited = editedTranslations.value.get(item.key)
  if (edited !== undefined) {
    return edited
  }
  if (discardedProposals.value.has(item.key)) {
    return undefined
  }
  return translations.value.get(item.key)
}

/**
 * Whether and how the item's field can be edited manually. Same routing as
 * the diff approval Edit action: `plain` → textarea, `frame` → backend editor
 * (needs `buildEditableFrameUrl`), `markup`/`table` → not editable.
 */
function editConfigFor(item: SourceItem): 'plain' | 'frame' | null {
  const config = types.editableFieldConfig.forName(
    item.entityType,
    item.entityBundle,
    item.fieldName,
  )
  if (!config) return null
  if (config.type === 'plain') return 'plain'
  if (config.type === 'frame') {
    return adapter.buildEditableFrameUrl ? 'frame' : null
  }
  return null
}

function openEditor(item: SourceItem) {
  const configType = editConfigFor(item)
  if (!configType) return
  // A current value equal to the source text is Drupal's untranslated
  // fallback, not a real translation — start empty in that case.
  const current = currentValues.value.get(item.key)
  editorSeed.value =
    effectiveValue(item) ?? (current && current !== item.value ? current : '')
  editorConfigType.value = configType
  editingKey.value = item.key
}

function onEditorSave(item: SourceItem, value: string) {
  const proposal = translations.value.get(item.key)
  // Reverting to the exact proposal (or clearing a manual-only entry) drops
  // the edit instead of storing a redundant one.
  if (value === proposal || (proposal === undefined && !value.trim())) {
    editedTranslations.value.delete(item.key)
    // Saving the proposal by hand means adopting it again.
    discardedProposals.value.delete(item.key)
  } else {
    editedTranslations.value.set(item.key, value)
  }
  editingKey.value = null
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

    // Load current translation values.
    const current = await adapter.loadTextFieldValuesForLanguage!(
      targetLanguage.value,
    )
    const map = new Map<string, string>()
    for (const v of current) {
      map.set(`${v.uuid}:${v.fieldName}`, v.value)
    }
    currentValues.value = map

    // Preselect only fields that need attention: missing or outdated
    // translations. Everything can still be selected via the header checkbox.
    for (const item of sourceValues.value) {
      selected.value[item.key] =
        isMissingTranslation(item) || outdatedUuids.value.has(item.uuid)
    }
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
    // Merge with earlier proposals so requesting more fields in a second
    // round doesn't lose the first round's results. A fresh proposal also
    // clears a previous discard — asking again means wanting it again.
    const map = new Map(translations.value)
    for (const result of response.data) {
      map.set(result.key, result.translatedText)
      discardedProposals.value.delete(result.key)
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
  const items = sourceValues.value
    .filter((item) => effectiveValue(item) !== undefined)
    .map((item) => {
      const separatorIndex = item.key.indexOf(':')
      return {
        langcode: targetLanguage.value,
        uuid: item.key.substring(0, separatorIndex),
        fieldName: item.key.substring(separatorIndex + 1),
        fieldValue: effectiveValue(item)!,
      }
    })

  if (!items.length) return

  isApplying.value = true
  errorMessage.value = ''

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
