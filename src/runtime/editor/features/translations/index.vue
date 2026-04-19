<template>
  <Teleport to="#bk-toolbar-after-title">
    <PluginTourItem
      v-if="items.length > 1"
      id="translations"
      :title="$t('translationsTourTitle', 'Translations')"
      :text="
        $t(
          'translationsTourText',
          'Quickly switch between available translations. A greyed out language indicates the content is not yet translated. Clicking on it opens the form to create a new translation for this language.',
        )
      "
    >
      <div class="bk-translations">
        <button
          v-if="isDropdown"
          class="bk-toolbar-button"
          :class="{ 'bk-is-active': isOpen }"
          @click.stop.prevent="isOpen = !isOpen"
        >
          {{ activeLangcode }}
        </button>
        <div
          v-if="isOpen || !isDropdown"
          :class="
            isDropdown
              ? 'bk-translations-dropdown'
              : 'bk-blokkli-item-options-radios bk-is-language'
          "
        >
          <label
            v-for="item in items"
            :key="item.id"
            class="group/tooltip"
            :class="{ 'bk-is-muted': !item.translation?.exists }"
          >
            <div>
              <input
                type="radio"
                :checked="item.checked"
                :value="item.id"
                name="pb_language"
                @click.stop.prevent="onClick(item, $event)"
              />
              <span>{{ item.code }}</span>
              <Tooltip v-show="!isOpen" :label="item.label" class="w-full" />
            </div>
          </label>
        </div>
      </div>
    </PluginTourItem>
  </Teleport>

  <Teleport to="#bk-banner-list">
    <Banner
      v-if="isTranslating"
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
    :title="$t('translationsMarkUpToDate', 'Mark translation as up-to-date')"
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
    :title="$t('translationsItemAction', 'Translate')"
    icon="bk_mdi_translate"
    :weight="-90"
    @click="onTranslate"
  />
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
import { PluginItemAction, PluginTourItem } from '#blokkli/editor/plugins'
import Banner from './Banner/index.vue'
import {
  defineMenuButton,
  defineHighlight,
  defineItemDropdownAction,
  onBlokkliEvent,
  useDialog,
} from '#blokkli/editor/composables'
import type { EntityTranslation, Language } from '#blokkli/editor/types/state'
import { BlokkliTransition, Tooltip } from '#blokkli/editor/components'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'

const CsvDialog = defineAsyncComponent(() => import('./CsvDialog/index.vue'))
const TranslateDialog = defineAsyncComponent(
  () => import('./TranslateDialog/index.vue'),
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

const autoTranslateLabel = computed(() => {
  return $t('translationsAutoTranslate', 'Auto-translate')
})

defineItemDropdownAction(() => {
  if (
    !isTranslating.value ||
    !adapter.requestTranslation ||
    !adapter.loadTextFieldValuesForLanguage ||
    !adapter.importTranslationsBatched
  ) {
    return
  }

  const selectedUuids = selection.uuids.value
  if (!selectedUuids.length) return

  return {
    id: 'auto-translate',
    label: autoTranslateLabel.value,
    icon: 'bk_mdi_translate',
    group: 'translate',
    weight: -80,
    callback: () => autoTranslateSelected(),
  }
})

async function autoTranslateSelected() {
  ui.setTransform(autoTranslateLabel.value)
  const sourceLanguage = state.translation.value.sourceLanguage || 'en'
  const targetLanguage = context.value.language
  const selectedUuids = new Set(selection.uuids.value)

  const sourceValues =
    await adapter.loadTextFieldValuesForLanguage!(sourceLanguage)
  const items = sourceValues
    .filter((v) => selectedUuids.has(v.uuid))
    .map((v) => ({
      key: `${v.uuid}:${v.fieldName}`,
      text: v.value,
      isHtml: v.fieldType === 'markup',
      sourceLanguage,
      targetLanguage,
    }))

  if (items.length) {
    const response = await adapter.requestTranslation!(items)
    if (!response.success || !response.data.length) return

    const importItems = response.data.map((result) => {
      const separatorIndex = result.key.indexOf(':')
      return {
        langcode: targetLanguage,
        uuid: result.key.substring(0, separatorIndex),
        fieldName: result.key.substring(separatorIndex + 1),
        fieldValue: result.translatedText,
      }
    })

    await state.mutateWithLoadingState(() =>
      adapter.importTranslationsBatched!({ items: importItems }),
    )
  }
  ui.setTransform(null)
}

const isOpen = ref(false)

const isDropdown = computed(() => {
  // Always a dropdown on mobile.
  if (ui.isMobile.value) {
    return true
  }

  // It is a dropdown if all langcodes combined is greater than 15.
  // That way up to 7 languages with 2-char langcodes are displayed as radio buttons.
  // This handles cases where langcodes are e.g. 'en-US', 'en-GB', 'de-CH', etc.
  // In this case it switches to a dropdown. This is better than relying on the number
  // languages.
  const allCodes = items.value.map((v) => v.code).join('')
  return allCodes.length > 15
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

type TranslationStateItem = {
  id: string
  code: string
  label: string
  checked: boolean
  translation?: EntityTranslation
}

const items = computed<TranslationStateItem[]>(() => {
  return (state.translation.value.availableLanguages || [])
    .map((language) => {
      if (language && language.id) {
        return {
          id: language.id,
          code: language.id.toUpperCase(),
          label: language.name,
          checked: context.value.language === language.id,
          translation: (state.translation.value.translations || []).find(
            (v) => v.id === language.id,
          ),
        }
      }
      return null
    })
    .filter(falsy)
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
    return $t(
      'translateEditDisabled',
      'Editing is disabled for this block type.',
    )
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

function onClick(item: TranslationStateItem, event: Event) {
  if (item.translation?.exists) {
    return adapter.changeLanguage(item.translation)
  }

  event.preventDefault()
  if (item.translation) {
    eventBus.emit('translateEntity', item.translation)
  }
}

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

<style lang="postcss">
.bk {
  .bk-translations {
    @apply relative text-xs lg:text-sm xl:text-base;
    .bk-toolbar-button {
      @apply uppercase h-full font-semibold;

      &.bk-is-active {
        @apply !bg-white text-mono-900;
      }
    }
    .bk-translations-dropdown {
      @apply absolute top-full right-0 lg:right-auto lg:left-0 max-w-[300px] bg-white z-toolbar-dropdown shadow-lg;

      label {
        @apply relative px-15 py-10 block cursor-pointer lg:hover:bg-mono-100 whitespace-nowrap text-sm;
        &.bk-is-muted {
          @apply text-mono-400;
        }
        > div {
          @apply flex items-center gap-10 md:gap-20 justify-between;
          span {
            @apply font-semibold order-last;
          }
        }
      }

      input {
        @apply appearance-none opacity-0 absolute top-0 left-0 w-full h-full cursor-pointer;
      }
    }
  }
}
</style>
