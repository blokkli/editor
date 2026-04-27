<template>
  <FileDropHandler
    icon="bk_mdi_translate"
    :label="$t('translationsDropToImport', 'Drop CSV or PO file to import')"
    :accept="acceptTranslationFile"
    class="flex flex-col h-full"
    @drop="addFiles"
  >
    <div v-if="files.length" class="flex flex-wrap items-center gap-8 pb-20">
      <div
        v-for="(file, index) in files"
        :key="index"
        class="flex items-center gap-5 bg-mono-100 rounded-full pl-10 pr-5 py-3 text-sm text-mono-800"
      >
        <span>{{ file.name }}</span>
        <button
          class="rounded-full p-2 text-mono-400 hover:text-mono-900 hover:bg-mono-200"
          @click="removeFile(file)"
        >
          <Icon name="bk_mdi_close" class="size-15" />
        </button>
      </div>
      <button class="bk-button bk-scheme-mono bk-is-light bk-is-small" @click.prevent="triggerFileDialog">
        {{ $t('translationsAddFiles', 'Add files...') }}
      </button>
    </div>
    <div v-else class="mx-auto py-20">
      <button
        type="button"
        class="bk-button bk-scheme-mono bk-is-light"
        @click.prevent="triggerFileDialog"
      >
        {{ $t('translationsSelectImportFile', 'Select CSV or PO file') }}
      </button>
    </div>
    <template v-if="files.length">
      <div
        v-if="changes && !changes.length"
        class="py-20 text-center text-mono-500"
      >
        {{ $t('translationsCsvNoChanges', 'No changes found') }}
      </div>
      <template v-else-if="changes && changes.length">
        <SelectionTable
          show-selection
          :selected-count="selectedCount"
          :total-count="changes.length"
          :label="$t('translationsCsvChangesLabel', 'fields will be updated')"
          @toggle-all="toggleAll"
        >
          <template #header>
            <th>{{ sourceLangName }}</th>
            <th v-if="!isMultiLang">
              {{ $t('translationsCsvDiff', 'Changes') }}
            </th>
            <th v-for="lang in languages" v-else :key="lang">
              {{ langName(lang) }}
            </th>
          </template>
          <template #body>
            <tr v-for="row in rows" :key="row.key">
              <td>
                <div class="bk-checkbox">
                  <input
                    type="checkbox"
                    :checked="isRowSelected(row)"
                    @change="toggleRow(row)"
                  />
                  <span class="!mt-0 before:!mt-0" />
                </div>
              </td>
              <td v-text="row.source" />
              <template v-if="!isMultiLang">
                <td>
                  <DiffValue
                    :before="singleLangChange(row).current"
                    :after="singleLangChange(row).imported"
                    :after-only="
                      !singleLangChange(row).current ||
                      singleLangChange(row).current === row.source
                    "
                  />
                </td>
              </template>
              <template v-else>
                <td v-for="lang in languages" :key="lang">
                  <div v-if="row.changes[lang]" class="flex items-start gap-8">
                    <div class="bk-checkbox shrink-0">
                      <input
                        v-model="selected[row.changes[lang]!.id]"
                        type="checkbox"
                      />
                      <span class="!mt-0 before:!mt-0" />
                    </div>
                    <DiffValue
                      :before="row.changes[lang]!.current"
                      :after="row.changes[lang]!.imported"
                      :after-only="
                        !row.changes[lang]!.current ||
                        row.changes[lang]!.current === row.source
                      "
                    />
                  </div>
                  <span v-else class="bk-is-empty">&mdash;</span>
                </td>
              </template>
            </tr>
          </template>
        </SelectionTable>
        <div class="flex items-center gap-10 mt-auto pt-20">
          <button
            class="bk-button bk-scheme-accent"
            :disabled="!selectedCount"
            @click="applyImport"
          >
            {{
              $t('translationsCsvApply', 'Import @count translations').replace(
                '@count',
                selectedCount.toString(),
              )
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
    </template>
    <input
      ref="fileInputEl"
      type="file"
      accept=".csv,.po,text/csv"
      multiple
      class="hidden"
      @change="onFileSelected"
    />
  </FileDropHandler>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, useTemplateRef, onMounted } from '#imports'
import {
  DiffValue,
  FileDropHandler,
  FormToggle,
  Icon,
} from '#blokkli/editor/components'
import { parseCsv, type CsvRow } from '../csv'
import { parsePo } from '../po'
import SelectionTable from '../../SelectionTable/index.vue'

type ImportChange = {
  id: string
  key: string
  langcode: string
  source: string
  current: string
  imported: string
}

const props = defineProps<{
  initialFiles?: File[] | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { adapter, $t, state, context } = useBlokkli()

const files = ref<File[]>([])
const changes = ref<ImportChange[] | null>(null)
const languages = ref<string[]>([])
const isMultiLang = computed(() => languages.value.length > 1)
const selected = ref<Record<string, boolean>>({})
const fileInputEl = useTemplateRef('fileInputEl')
const markUpToDate = ref(false)

type ImportRow = {
  key: string
  source: string
  changes: Record<string, ImportChange>
}

const rows = computed<ImportRow[]>(() => {
  if (!changes.value) return []
  const map = new Map<string, ImportRow>()
  for (const change of changes.value) {
    let row = map.get(change.key)
    if (!row) {
      row = { key: change.key, source: change.source, changes: {} }
      map.set(change.key, row)
    }
    row.changes[change.langcode] = change
  }
  return [...map.values()]
})

const sourceLangName = computed(() => {
  const id = state.translation.value.sourceLanguage
  return (
    state.translation.value.availableLanguages?.find((l) => l.id === id)
      ?.name ?? id
  )
})

function langName(langcode: string): string {
  return (
    state.translation.value.availableLanguages?.find((l) => l.id === langcode)
      ?.name ?? langcode
  )
}

const selectedCount = computed(
  () => changes.value?.filter((c) => selected.value[c.id]).length ?? 0,
)

function isRowSelected(row: ImportRow): boolean {
  const rowChanges = Object.values(row.changes)
  return rowChanges.length > 0 && rowChanges.every((c) => selected.value[c.id])
}

function toggleRow(row: ImportRow) {
  const newValue = !isRowSelected(row)
  for (const change of Object.values(row.changes)) {
    selected.value[change.id] = newValue
  }
}

function singleLangChange(row: ImportRow): ImportChange {
  return Object.values(row.changes)[0]!
}

function toggleAll() {
  if (!changes.value) return
  const allSelected =
    changes.value.length > 0 && selectedCount.value === changes.value.length
  const newValue = !allSelected
  for (const change of changes.value) {
    selected.value[change.id] = newValue
  }
}

async function loadCurrentValues(
  langcode: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const values = await adapter.loadTextFieldValuesForLanguage!(langcode)
  for (const v of values) {
    map.set(`${v.uuid}:${v.fieldName}`, v.value)
  }
  return map
}

async function addFiles(newFiles: File[]) {
  const filtered = newFiles.filter(
    (f) => f.name.endsWith('.csv') || f.name.endsWith('.po'),
  )
  if (!filtered.length) return
  files.value = [...files.value, ...filtered]
  await reprocess()
}

async function removeFile(file: File) {
  files.value = files.value.filter((f) => f !== file)
  selected.value = {}
  if (!files.value.length) {
    changes.value = null
    languages.value = []
    return
  }
  await reprocess()
}

async function reprocess() {
  selected.value = {}
  await processFiles(files.value)
}

async function processFiles(allFiles: File[]) {
  const poFiles = allFiles.filter((f) => f.name.endsWith('.po'))
  const csvFiles = allFiles.filter((f) => f.name.endsWith('.csv'))

  if (csvFiles.length) {
    await processCsvFile(csvFiles[0]!)
  } else if (poFiles.length) {
    await processPoFiles(poFiles)
  }
}

async function processPoFiles(files: File[]) {
  // Parse all PO files and group rows by language.
  // Later files overwrite earlier ones for the same language + key.
  const rowsByLang = new Map<string, Map<string, CsvRow>>()
  const langs: string[] = []

  for (const file of files) {
    const text = await file.text()
    const parsed = parsePo(text)
    const lang = parsed.language || context.value.language

    if (!rowsByLang.has(lang)) {
      langs.push(lang)
      rowsByLang.set(lang, new Map())
    }
    const langRows = rowsByLang.get(lang)!
    for (const row of parsed.rows) {
      langRows.set(row.key, row)
    }
  }

  // Load current values and build changes.
  const newChanges: ImportChange[] = []
  for (const lang of langs) {
    const currentMap = await loadCurrentValues(lang)
    for (const row of rowsByLang.get(lang)!.values()) {
      const current = currentMap.get(row.key) ?? ''
      if (row.translation !== current && row.translation !== '') {
        const change: ImportChange = {
          id: `${lang}:${row.key}`,
          key: row.key,
          langcode: lang,
          source: row.source,
          current,
          imported: row.translation,
        }
        newChanges.push(change)
        selected.value[change.id] = true
      }
    }
  }

  languages.value = langs
  changes.value = newChanges
}

async function processCsvFile(file: File) {
  const text = await file.text()
  const parsed = parseCsv(text)

  if (parsed.type === 'single') {
    // Single-language CSV → current translation language.
    const lang = context.value.language
    const currentMap = await loadCurrentValues(lang)

    const newChanges: ImportChange[] = []
    for (const row of parsed.rows) {
      const current = currentMap.get(row.key) ?? ''
      if (row.translation !== current && row.translation !== '') {
        const change: ImportChange = {
          id: `${lang}:${row.key}`,
          key: row.key,
          langcode: lang,
          source: row.source,
          current,
          imported: row.translation,
        }
        newChanges.push(change)
        selected.value[change.id] = true
      }
    }

    languages.value = [lang]
    changes.value = newChanges
  } else {
    // Multi-language CSV → one change per language per field.
    const currentMaps = new Map<string, Map<string, string>>()
    for (const lang of parsed.languages) {
      currentMaps.set(lang, await loadCurrentValues(lang))
    }

    const newChanges: ImportChange[] = []
    for (const row of parsed.rows) {
      for (const lang of parsed.languages) {
        const translation = row.translations[lang] ?? ''
        const current = currentMaps.get(lang)?.get(row.key) ?? ''
        if (translation !== current && translation !== '') {
          const change: ImportChange = {
            id: `${lang}:${row.key}`,
            key: row.key,
            langcode: lang,
            source: row.source,
            current,
            imported: translation,
          }
          newChanges.push(change)
          selected.value[change.id] = true
        }
      }
    }

    languages.value = parsed.languages
    changes.value = newChanges
  }
}

async function onFileSelected(e: Event) {
  const fileList = (e.target as HTMLInputElement).files
  if (!fileList?.length) return
  await addFiles([...fileList])
  // Reset so re-selecting the same file triggers change.
  if (fileInputEl.value) {
    fileInputEl.value.value = ''
  }
}

async function applyImport() {
  if (!changes.value) return

  const selectedChanges = changes.value.filter((c) => selected.value[c.id])
  if (!selectedChanges.length) return

  const items = selectedChanges.map((change) => {
    const separatorIndex = change.key.indexOf(':')
    return {
      langcode: change.langcode,
      uuid: change.key.substring(0, separatorIndex),
      fieldName: change.key.substring(separatorIndex + 1),
      fieldValue: change.imported,
    }
  })

  await state.mutateWithLoadingState(() =>
    adapter.importTranslationsBatched!({
      items,
      markUpToDate: markUpToDate.value,
    }),
  )

  emit('close')
}

function acceptTranslationFile(item: DataTransferItem): boolean {
  if (item.kind !== 'file') return false
  if (item.type.startsWith('text/') || !item.type) return true
  return false
}

function triggerFileDialog() {
  fileInputEl.value?.click()
}

onMounted(() => {
  if (props.initialFiles?.length) {
    addFiles(props.initialFiles)
  } else {
    triggerFileDialog()
  }
})
</script>
