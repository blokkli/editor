<template>
  <Teleport to="#bk-toolbar-after-title">
    <PluginTourItem
      v-if="items.length"
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
              <div :class="{ 'bk-tooltip': !isDropdown }">{{ item.label }}</div>
            </div>
          </label>
        </div>
      </div>
    </PluginTourItem>
  </Teleport>

  <Teleport to="#bk-banner-list">
    <Banner v-if="isTranslating" :active-language />
  </Teleport>

  <PluginMenuButton
    id="translations"
    :title="$t('translationsBatchTranslateMenuTitle', 'Translate...')"
    :description="
      $t('translationsBatchTranslateMenuDescription', 'Translate all blocks')
    "
    :disabled="!isTranslating"
    :weight="60"
    icon="translate"
    @click="eventBus.emit('batchTranslate')"
  />

  <PluginItemAction
    v-if="isTranslating"
    id="translate"
    :disabled="!canTranslateBlock"
    :title="$t('translationsItemAction', 'Translate')"
    icon="translate"
    :weight="-100"
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
} from '#imports'
import { falsy } from '#blokkli/helpers'
import {
  PluginMenuButton,
  PluginItemAction,
  PluginTourItem,
} from '#blokkli/plugins'
import type {
  EntityTranslation,
  Language,
  RenderedFieldListItem,
} from '#blokkli/types'
import Banner from './Banner/index.vue'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { adapter } = defineBlokkliFeature({
  id: 'translations',
  label: 'Translations',
  icon: 'translate',
  requiredAdapterMethods: ['changeLanguage'],
  description: 'Adds support for block translations.',
})

const { eventBus, state, context, $t, ui, selection, types, definitions } =
  useBlokkli()

const isTranslating = computed(() => state.editMode.value === 'translating')

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

const canTranslateBlock = computed(() => {
  const block = selection.item.value
  if (!block) {
    return false
  }

  if (block.library?.libraryItemUuid) {
    return false
  }

  const definition = definitions.getBlockDefinition(
    block.bundle,
    block.fieldListType,
    block.parentBlockBundle,
  )

  if (definition?.editor?.disableEdit) {
    return false
  }
  const type = types.getBlockBundleDefinition(block.bundle)

  if (!type) {
    return false
  }

  if (!type.isTranslatable) {
    return false
  }

  return true
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

function onTranslate(items: RenderedFieldListItem[]) {
  const item = items[0]
  if (item) {
    eventBus.emit('item:edit', {
      uuid: item.uuid,
      bundle: item.bundle,
    })
  }
}

onBlokkliEvent('item:doubleClick', function (block) {
  if (isTranslating.value && canTranslateBlock.value) {
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
</script>

<script lang="ts">
export default {
  name: 'Translations',
}
</script>
