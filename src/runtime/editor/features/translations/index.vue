<template>
  <Teleport to="#bk-toolbar-after-title">
    <LanguageSwitcher :active-language />
  </Teleport>

  <Teleport to="#bk-banner-list">
    <Banner
      v-if="isTranslating"
      v-show="!ui.isApproving.value"
      :active-language
      :show-csv="
        !!adapter.loadTextFieldValuesForLanguage &&
        !!adapter.importTranslationsBatched
      "
      :show-translate="
        !!adapter.requestTranslation &&
        !!adapter.loadTextFieldValuesForLanguage &&
        !!adapter.importTranslationsBatched
      "
      :dialog-open="showCsvDialog"
      @mark-all-up-to-date="onMarkUpToDate"
      @open-csv="showCsvDialog = true"
      @open-translate="showTranslateDialog = true"
      @import-file="onImportFile"
    />
  </Teleport>

  <PluginItemAction
    v-if="isTranslating && adapter.markTranslationUpToDate"
    id="mark-translation-up-to-date"
    :disabled="markUpToDateDisabledReason"
    disabled-reason-success
    multiple
    :title="$t('translationsMarkUpToDate', 'Mark as up-to-date')"
    :description="
      $t(
        'translationsMarkUpToDateDescription',
        'Marks all text translations of this block as up-to-date.',
      )
    "
    icon="bk_mdi_check_circle"
    :weight="-100"
    @click="onMarkUpToDate"
  />

  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <CsvDialog
        v-if="showCsvDialog"
        :initial-files="pendingImportFiles"
        @close="onCsvDialogClose"
      />
    </BlokkliTransition>
    <BlokkliTransition name="slide-up">
      <TranslateDialog
        v-if="showTranslateDialog"
        @close="showTranslateDialog = false"
      />
    </BlokkliTransition>
  </Teleport>

  <PluginItemAction
    v-if="isTranslating"
    id="translate"
    :disabled="translateDisabledReason"
    :title="$t('editTranslation', 'Edit translation') + '...'"
    :description="
      $t('editTranslationDescription', 'Manually add or edit the translations.')
    "
    icon="bk_mdi_translate"
    :weight="-90"
    @click="onTranslate"
  />

  <AutoTranslate />
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  defineBlokkliFeature,
  onMounted,
  defineAsyncComponent,
} from '#imports'
import { falsy } from '#blokkli/helpers'
import { PluginItemAction } from '#blokkli/editor/plugins'
import {
  defineMenuButton,
  defineHighlight,
  onBlokkliEvent,
  useDialog,
} from '#blokkli/editor/composables'
import type { Language } from '#blokkli/editor/types/state'
import { BlokkliTransition } from '#blokkli/editor/components'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'
import LanguageSwitcher from './LanguageSwitcher/index.vue'

const CsvDialog = defineAsyncComponent(() => import('./CsvDialog/index.vue'))
const TranslateDialog = defineAsyncComponent(
  () => import('./TranslateDialog/index.vue'),
)
const Banner = defineAsyncComponent(() => import('./Banner/index.vue'))
const AutoTranslate = defineAsyncComponent(
  () => import('./AutoTranslate/index.vue'),
)

const { adapter } = defineBlokkliFeature({
  id: 'translations',
  label: 'Translations',
  icon: 'bk_mdi_translate',
  requiredAdapterMethods: ['changeLanguage'],
  description: 'Adds support for block translations.',
})

const {
  eventBus,
  state,
  context,
  $t,
  ui,
  selection,
  types,
  definitions,
  blocks,
} = useBlokkli()

const showCsvDialog = useDialog('translations-csv', 'center')
const showTranslateDialog = useDialog('translations-translate', 'center')
const pendingImportFiles = ref<File[] | null>(null)

const isTranslating = computed(() => state.editMode.value === 'translating')

function onImportFile(files: File[]) {
  pendingImportFiles.value = files
  showCsvDialog.value = true
}

function onCsvDialogClose() {
  showCsvDialog.value = false
  pendingImportFiles.value = null
}

defineHighlight(() => {
  if (!isTranslating.value) {
    return
  }
  const lang = context.value.language
  return blocks
    .getAllBlocks()
    .filter((block) => block.outdatedTranslations.includes(lang))
    .map((block) => ({
      uuid: block.uuid,
      color: 'yellow' as const,
      icon: 'bk_mdi_translate' as const,
      label: $t('outdatedTranslation', 'Outdated translation'),
      description: $t(
        'outdatedTranslationDescription',
        'Mark translation as up-to-date',
      ),
      onClick: () => onMarkUpToDate([block]),
    }))
})

const activeLangcode = computed(() => context.value.language)
const activeLanguage = computed<Language>(() => {
  return (
    state.translation.value.availableLanguages?.find(
      (v) => v.id === activeLangcode.value,
    ) || {
      id: activeLangcode.value,
      name: activeLangcode.value,
    }
  )
})

const translateDisabledReason = computed<false | string>(() => {
  const block = selection.item.value
  if (!block) {
    return false
  }

  if (block.library?.libraryItemUuid) {
    return $t(
      'translateLibraryBlock',
      'Reusable blocks cannot be translated here.',
    )
  }

  const definition = definitions.getBlockDefinition(
    block.bundle,
    block.fieldListType,
    block.parentBlockBundle,
  )

  if (definition?.editor?.disableEdit) {
    return $t('editingDisabled', 'Editing is disabled for this block type.')
  }
  const type = types.getBlockBundleDefinition(block.bundle)

  if (!type || !type.isTranslatable) {
    return $t(
      'translateNotTranslatable',
      'This block type is not translatable.',
    )
  }

  return false
})

const markUpToDateDisabledReason = computed<false | string>(() => {
  const lang = context.value.language
  if (
    selection.items.value.some((item) =>
      item.outdatedTranslations.includes(lang),
    )
  ) {
    return false
  }
  return $t(
    'translationsMarkUpToDateDisabled',
    'No selected blocks have an outdated translation.',
  )
})

function onTranslate(items: RenderedFieldListItem[]) {
  const item = items[0]
  if (item) {
    eventBus.emit('item:edit', {
      uuid: item.uuid,
      bundle: item.bundle,
    })
  }
}

function onMarkUpToDate(items: RenderedFieldListItem[] | string[]) {
  if (!adapter.markTranslationUpToDate) return
  const lang = context.value.language
  const uuids = items
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }
      if (item.outdatedTranslations.includes(lang)) {
        return item.uuid
      }

      return null
    })
    .filter(falsy)

  if (!uuids.length) {
    return
  }

  state.mutateWithLoadingState(() =>
    adapter.markTranslationUpToDate!(uuids, context.value.language),
  )
}

onBlokkliEvent('item:doubleClick', function (block) {
  if (isTranslating.value && !translateDisabledReason.value) {
    onTranslate([block])
  }
})

onBlokkliEvent('entity:translated', (langcode) => {
  const targetTranslation = state.translation.value.translations?.find(
    (v) => v.id === langcode,
  )
  if (targetTranslation) {
    adapter.changeLanguage(targetTranslation)
  }
})

onMounted(() => {
  // Make sure the user is not trying to edit a translation that does not exist.
  const translationExists = !!state.translation.value.translations?.find(
    (v) => v.id === context.value.language,
  )
  if (!translationExists) {
    const sourceTranslation = state.translation.value.translations?.find(
      (v) => v.id === state.translation.value.sourceLanguage,
    )
    if (sourceTranslation) {
      return adapter.changeLanguage(sourceTranslation)
    }
  }
})

defineMenuButton(() => {
  return {
    id: 'translations',
    title: $t('translationsBatchTranslateMenuTitle', 'Translate...'),
    description: $t(
      'translationsBatchTranslateMenuDescription',
      'Translate all blocks',
    ),
    icon: 'bk_mdi_translate',
    disabled: !isTranslating.value,
    weight: 60,
    callback: () => {
      if (
        adapter.requestTranslation &&
        adapter.loadTextFieldValuesForLanguage &&
        adapter.importTranslationsBatched
      ) {
        showTranslateDialog.value = true
      } else {
        eventBus.emit('batchTranslate')
      }
    },
  }
})
</script>

<script lang="ts">
export default {
  name: 'Translations',
}
</script>
