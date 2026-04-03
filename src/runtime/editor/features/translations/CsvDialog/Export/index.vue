<template>
  <div class="flex flex-col h-full">
    <div class="flex gap-30 items-end flex-wrap pb-20">
      <FormCheckboxes
        id="export-languages"
        v-model="selectedLanguages"
        :label="$t('translationsCsvLanguages', 'Languages')"
        :options="languageOptions"
        inline
        @update:model-value="loadExportData"
      />
      <div class="flex flex-col h-full pb-[4px]">
        <div class="bk-form-label">Filter</div>
        <div class="flex gap-20 mt-auto">
          <FormToggle
            v-model="onlyOutdated"
            :label="
              $t('translationsCsvOnlyOutdated', 'Only outdated translations')
            "
          />
          <FormToggle
            v-model="onlyMissing"
            :label="
              $t('translationsCsvOnlyMissing', 'Only missing translations')
            "
          />
        </div>
      </div>
    </div>
    <div v-if="isLoading" class="flex items-center gap-10 py-20">
      <Loading />
    </div>
    <template v-else-if="exportRows.length">
      <div class="overflow-auto border border-mono-300 rounded flex-1">
        <table class="bk-csv-table font-mono w-full text-xs select-text">
          <thead>
            <tr>
              <th>Key</th>
              <th>{{ sourceLangName }}</th>
              <th v-for="lang in activeLanguages" :key="lang.id">
                {{ lang.name }}
              </th>
            </tr>
          </thead>
          <tbody>
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
          </tbody>
        </table>
      </div>
      <div class="flex gap-10 flex-wrap pt-20">
        <button class="bk-button" @click="downloadCsv">
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
          class="bk-button"
          @click="downloadPo(lang.id)"
        >
          <div
            class="uppercase font-bold border-2 leading-none rounded-md px-3 py-2 -ml-5"
          >
            po
          </div>
          <span>{{ $t('download', 'Download') }} {{ lang.name }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted } from '#imports'
import { itemEntityType } from '#blokkli-build/config'
import { Loading, FormToggle, FormCheckboxes } from '#blokkli/editor/components'
import type { MultiLangRow } from '../csv'
import { buildMultiLangCsv } from '../csv'
import { buildPo } from '../po'
import type { Language } from '#blokkli/editor/types/state'

const {
  adapter,
  $t,
  state,
  fieldValue,
  blocks,
  context,
  element,
  ui,
  directive,
} = useBlokkli()

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

    // Sort source values by DOM order: first by block position in the DOM,
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

    // Group source values by UUID to sort fields within each block.
    const grouped = new Map<string, typeof sourceValues>()
    for (const sv of sourceValues) {
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

    // Build sorted source values: blocks in DOM order, fields in DOM order within each block.
    const sortedValues = [...grouped.entries()]
      .sort((a, b) => {
        const idxA = uuidIndexMap.get(a[0]) ?? Infinity
        const idxB = uuidIndexMap.get(b[0]) ?? Infinity
        return idxA - idxB
      })
      .flatMap(([, fields]) => fields)

    exportRows.value = sortedValues.map((sv) => {
      const key = `${sv.uuid}:${sv.fieldName}`
      const translations: Record<string, string> = {}
      for (const langId of langIds) {
        translations[langId] = translationMaps.get(langId)?.get(key) ?? ''
      }
      return { key, source: sv.value, translations }
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
