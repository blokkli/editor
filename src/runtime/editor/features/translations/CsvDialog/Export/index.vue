<template>
  <div class="flex flex-col h-full">
    <div v-if="isLoading" class="flex items-center gap-10 py-20">
      <Loading />
    </div>
    <template v-else-if="exportRows.length">
      <SelectionTable
        v-model:only-outdated="onlyOutdated"
        v-model:only-untranslated="onlyMissing"
        show-filters
        :total-count="filteredRows.length"
      >
        <template #toolbar>
          <FormCheckboxes
            id="export-languages"
            v-model="selectedLanguages"
            :label="$t('translationsCsvLanguages', 'Languages')"
            :options="languageOptions"
            inline
            @update:model-value="loadExportData"
          />
        </template>
        <template #header>
          <th>Key</th>
          <th>{{ sourceLangName }}</th>
          <th v-for="lang in activeLanguages" :key="lang.id">
            {{ lang.name }}
          </th>
        </template>
        <template #body>
          <tr v-for="row in filteredRows" :key="row.key">
            <td class="text-mono-400" v-text="row.key" />
            <td v-text="row.source" />
            <td
              v-for="lang in activeLanguages"
              :key="lang.id"
              :class="{
                'bk-is-empty': !row.translations[lang.id],
              }"
              v-text="row.translations[lang.id] || '—'"
            />
          </tr>
        </template>
      </SelectionTable>
      <div class="flex gap-10 flex-wrap pt-20">
        <button class="bk-button bk-scheme-mono bk-is-light" @click="downloadCsv">
          <div
            class="uppercase font-bold border-2 leading-none rounded-md px-3 py-2 -ml-5"
          >
            csv
          </div>
          <span>{{ $t('download', 'Download') }}</span>
        </button>
        <button
          v-for="lang in activeLanguages"
          :key="lang.id"
          class="bk-button bk-scheme-mono bk-is-light"
          @click="downloadPo(lang.id)"
        >
          <div
            class="uppercase font-bold border-2 leading-none rounded-md px-3 py-2 -ml-5"
          >
            po
          </div>
          <span>{{
            $t('downloadWithLabel', 'Download @label').replace(
              '@label',
              lang.name,
            )
          }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted } from '#imports'
import { itemEntityType } from '#blokkli-build/config'
import { Loading, FormCheckboxes } from '#blokkli/editor/components'
import type { MultiLangRow } from '../csv'
import { buildMultiLangCsv } from '../csv'
import { buildPo } from '../po'
import type { Language } from '#blokkli/editor/types/state'
import SelectionTable from '../../SelectionTable/index.vue'

const { adapter, $t, state, blocks, context, element, ui, directive } =
  useBlokkli()

const isLoading = ref(false)
const onlyOutdated = ref(false)
const onlyMissing = ref(false)
const exportRows = ref<MultiLangRow[]>([])
const selectedLanguages = ref<string[]>([])

const availableLanguages = computed<Language[]>(() => {
  const source = state.translation.value.sourceLanguage
  return (
    state.translation.value.availableLanguages?.filter(
      (l) => l.id !== source,
    ) ?? []
  )
})

const languageOptions = computed(() =>
  availableLanguages.value.map((l) => ({ value: l.id, label: l.name })),
)

const activeLanguages = computed(() =>
  availableLanguages.value.filter((l) =>
    selectedLanguages.value.includes(l.id),
  ),
)

const filteredRows = computed(() => {
  let rows = exportRows.value

  if (onlyOutdated.value) {
    const activeLangIds = activeLanguages.value.map((l) => l.id)
    const outdatedUuids = new Set(
      blocks
        .getAllBlocks()
        .filter((b) =>
          b.outdatedTranslations.some((lang) => activeLangIds.includes(lang)),
        )
        .map((b) => b.uuid),
    )
    rows = rows.filter((row) => {
      // Host entity fields don't have outdated state, always include them.
      if (row.entityType !== itemEntityType) return true
      const uuid = row.key.substring(0, row.key.indexOf(':'))
      return outdatedUuids.has(uuid)
    })
  }

  if (onlyMissing.value) {
    const activeLangIds = activeLanguages.value.map((l) => l.id)
    rows = rows.filter((row) =>
      activeLangIds.some((lang) => {
        const val = row.translations[lang]
        return !val || val === row.source
      }),
    )
  }

  return rows
})

const sourceLangName = computed(() => {
  const id = state.translation.value.sourceLanguage
  return (
    state.translation.value.availableLanguages?.find((l) => l.id === id)
      ?.name ?? id
  )
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildTimestamp(): string {
  const now = new Date()
  return (
    [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-') +
    '--' +
    [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
    ].join('-')
  )
}

function buildFilename(ext: string, langcode?: string): string {
  const langPart = langcode ?? activeLanguages.value.map((l) => l.id).join('-')
  const pageSlug = slugify(state.entity.value.label || 'page')
  return `${pageSlug}--${langPart}-${buildTimestamp()}.${ext}`
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadCsv() {
  const langIds = activeLanguages.value.map((l) => l.id)
  const content = buildMultiLangCsv(filteredRows.value, langIds)
  triggerDownload(content, buildFilename('csv'), 'text/csv;charset=utf-8')
}

function downloadPo(langcode: string) {
  const rows = filteredRows.value.map((row) => ({
    key: row.key,
    source: row.source,
    translation: row.translations[langcode] ?? '',
  }))
  const content = buildPo(rows, langcode)
  triggerDownload(
    content,
    buildFilename('po', langcode),
    'text/x-gettext;charset=utf-8',
  )
}

async function loadExportData() {
  const sourceLanguage = state.translation.value.sourceLanguage
  if (!sourceLanguage) {
    return
  }

  const langIds = selectedLanguages.value.filter((id) =>
    availableLanguages.value.some((l) => l.id === id),
  )

  if (!langIds.length) {
    exportRows.value = []
    return
  }

  isLoading.value = true

  try {
    const sourceValues =
      await adapter.loadTextFieldValuesForLanguage!(sourceLanguage)

    const translationMaps = new Map<string, Map<string, string>>()
    for (const langId of langIds) {
      const values = await adapter.loadTextFieldValuesForLanguage!(langId)
      const map = new Map<string, string>()
      for (const v of values) {
        map.set(`${v.uuid}:${v.fieldName}`, v.value)
      }
      translationMaps.set(langId, map)
    }

    // Separate host entity fields from block fields.
    const hostFields = sourceValues.filter(
      (sv) => sv.entityType !== itemEntityType,
    )
    const blockFields = sourceValues.filter(
      (sv) => sv.entityType === itemEntityType,
    )

    // Sort block fields by DOM order: first by block position in the DOM,
    // then within each block by editable element position.
    const uuidOrder = element.queryAll(
      ui.providerElement,
      '.bk-field-list-item',
      'getExportOrder',
      (el) => el.dataset.bkUuid,
    )
    const uuidIndexMap = new Map<string, number>()
    for (let i = 0; i < uuidOrder.length; i++) {
      const uuid = uuidOrder[i]
      if (uuid && !uuidIndexMap.has(uuid)) {
        uuidIndexMap.set(uuid, i)
      }
    }

    // Group block fields by UUID to sort fields within each block.
    const grouped = new Map<string, typeof blockFields>()
    for (const sv of blockFields) {
      let group = grouped.get(sv.uuid)
      if (!group) {
        group = []
        grouped.set(sv.uuid, group)
      }
      group.push(sv)
    }

    // Sort fields within each block by their editable element's DOM position.
    for (const [uuid, fields] of grouped) {
      if (fields.length <= 1) continue
      const block = blocks.getBlock(uuid)
      if (!block) continue
      const host = { uuid, type: itemEntityType, bundle: block.bundle }
      fields.sort((a, b) => {
        const elA = directive.findEditableElement(a.fieldName, host)
        const elB = directive.findEditableElement(b.fieldName, host)
        if (!elA || !elB) return 0
        const pos = elA.compareDocumentPosition(elB)
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1
        return 0
      })
    }

    // Build sorted values: host fields first, then blocks in DOM order.
    const sortedBlockFields = [...grouped.entries()]
      .sort((a, b) => {
        const idxA = uuidIndexMap.get(a[0]) ?? Infinity
        const idxB = uuidIndexMap.get(b[0]) ?? Infinity
        return idxA - idxB
      })
      .flatMap(([, fields]) => fields)

    const sortedValues = [...hostFields, ...sortedBlockFields]

    exportRows.value = sortedValues.map((sv) => {
      const key = `${sv.uuid}:${sv.fieldName}`
      const translations: Record<string, string> = {}
      for (const langId of langIds) {
        translations[langId] = translationMaps.get(langId)?.get(key) ?? ''
      }
      return { key, source: sv.value, entityType: sv.entityType, translations }
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const currentLang = context.value.language
  if (availableLanguages.value.some((l) => l.id === currentLang)) {
    selectedLanguages.value = [currentLang]
  }
  loadExportData()
})
</script>
