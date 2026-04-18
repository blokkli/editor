<template>
  <Banner id="translate" scheme="yellow">
    <FileDropHandler
      icon="bk_mdi_translate"
      :label="$t('translationsDropToImport', 'Drop CSV or PO file to import')"
      :accept="acceptTranslationFile"
      @drop="onFileDrop"
    >
      <BannerInner
        icon="bk_mdi_translate"
        :text
        :button="$t('translationsBannerButton', 'Edit source language instead')"
        @click="onClick"
      >
        <template #before>
          <TransitionHeight opacity :duration="300">
            <div v-if="outdatedUuids.length" class="pb-10">
              <div
                class="pb-10 border-b border-b-scheme-dark/40 flex justify-between items-center"
              >
                <div class="text-base" v-html="outdatedLabel" />
                <div class="flex gap-5 relative">
                  <button
                    class="bk-button bk-is-small bk-is-scheme-outline group/tooltip"
                    @click.prevent="$emit('mark-all-up-to-date', outdatedUuids)"
                  >
                    {{
                      $t(
                        'translationsBannerMarkAllAsUpToDate',
                        'Mark all as up-to-date',
                      )
                    }}
                  </button>
                  <button
                    class="bk-button bk-is-small bk-is-scheme-outline group/tooltip"
                    @click.prevent="eventBus.emit('select:prev', outdatedUuids)"
                  >
                    <Icon name="bk_mdi_arrow_left_alt" />
                    {{ $t('translationsBannerPrev', 'Previous block') }}
                  </button>
                  <button
                    class="bk-button bk-is-small bk-is-scheme-outline group/tooltip"
                    @click.prevent="eventBus.emit('select:next', outdatedUuids)"
                  >
                    {{ $t('translationsBannerNext', 'Next block') }}
                    <Icon name="bk_mdi_arrow_right_alt" />
                  </button>
                </div>
              </div>
            </div>
          </TransitionHeight>
        </template>
        <template v-if="showCsv || showTranslate" #before-button>
          <div class="flex gap-10 relative">
            <button
              v-if="showTranslate"
              class="bk-button bk-is-small bk-is-scheme-outline group/tooltip"
              @click.prevent="$emit('open-translate')"
            >
              <Icon name="bk_mdi_translate" />
              {{ $t('translationsAutoTranslateButton', 'Auto-translate...') }}
              <Tooltip
                :label="
                  $t(
                    'translationsAutoTranslateTooltip',
                    'Automatically translate all texts using a translation service',
                  )
                "
                placement="above-left"
              />
            </button>
            <button
              v-if="showCsv"
              class="bk-button bk-is-small bk-is-scheme-outline group/tooltip"
              @click.prevent="$emit('open-csv')"
            >
              <Icon name="bk_mdi_upload" />
              {{ $t('translationsCsvMenuTitle', 'Import/export...') }}
              <Tooltip
                :label="
                  $t(
                    'translationsCsvTooltip',
                    'Import or export translations as CSV or PO files',
                  )
                "
                placement="above-left"
              />
            </button>
          </div>
        </template>
      </BannerInner>
    </FileDropHandler>
  </Banner>
</template>

<script setup lang="ts">
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import {
  Banner,
  BannerInner,
  FileDropHandler,
  Icon,
  TransitionHeight,
  Tooltip,
} from '#blokkli/editor/components'
import type { Language } from '#blokkli/editor/types/state'

const props = defineProps<{
  activeLanguage: Language
  showCsv?: boolean
  showTranslate?: boolean
  dialogOpen?: boolean
}>()

const { $t, adapter, state, ui, eventBus, blocks } = useBlokkli()

const emit = defineEmits<{
  (e: 'mark-all-up-to-date', uuids: string[]): void
  (e: 'open-csv' | 'open-translate'): void
  (e: 'import-file', files: File[]): void
}>()

const outdatedUuids = computed(() => {
  const lang = props.activeLanguage.id
  return blocks
    .getAllBlocks()
    .filter((b) => b.outdatedTranslations.includes(lang))
    .map((b) => b.uuid)
})

function acceptTranslationFile(item: DataTransferItem): boolean {
  if (!props.showCsv || props.dialogOpen) return false
  if (item.kind !== 'file') return false
  // CSV and PO files can have text/csv, text/plain, or no MIME type.
  if (item.type.startsWith('text/') || !item.type) return true
  return false
}

function onFileDrop(files: File[]) {
  const matched = files.filter(
    (f) => f.name.endsWith('.csv') || f.name.endsWith('.po'),
  )
  if (matched.length) {
    emit('import-file', matched)
  }
}

const onClick = () => {
  const sourceLanguage = state.translation.value.sourceLanguage
  if (!sourceLanguage) {
    throw new Error(
      'Missing property "sourceLanguage" in TranslationState object.',
    )
  }

  const sourceTranslation = state.translation.value.translations?.find(
    (v) => v.id === sourceLanguage,
  )

  if (!sourceTranslation) {
    throw new Error(
      `Failed to find translation for language "${sourceLanguage}".`,
    )
  }

  adapter.changeLanguage!(sourceTranslation)
}

const text = computed(() => {
  return $t(
    'translationsBannerText',
    'You are currently editing the <strong>@language</strong> translation.',
  ).replace('@language', props.activeLanguage.name)
})

const outdatedLabel = computed(() => {
  const count = outdatedUuids.value.length
  if (!count) {
    return null
  }
  const key =
    count === 1
      ? $t(
          'translationsBannerOutdatedSingular',
          '@count block has an <strong>outdated translation</strong>.',
        )
      : $t(
          'translationsBannerOutdatedCount',
          '@count blocks have <strong>outdated translations</strong>.',
        )
  return key.replace('@count', String(count))
})

onMounted(() => {
  ui.setSelectionColor('translating', 'mono')
})

onBeforeUnmount(() => {
  ui.removeSelectionColor('translating')
})
</script>
