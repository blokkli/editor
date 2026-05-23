<template>
  <PluginTourItem
    v-if="items.length > 1"
    id="translations"
    :title="$t('translations', 'Translations')"
    :text="
      $t(
        'translationsTourText',
        'Quickly switch between available translations. A greyed out language indicates the content is not yet translated. Clicking on it opens the form to create a new translation for this language.',
      )
    "
  >
    <Dropdown v-if="isDropdown" :items :active-language @select="onClick" />
    <InlineButtons
      v-else
      :items
      @select="onClick"
      :active-langcode="activeLanguage.id"
    />
  </PluginTourItem>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { PluginTourItem } from '#blokkli/editor/plugins'
import type { Language } from '#blokkli/editor/types/state'
import { falsy } from '#blokkli/helpers'
import type { TranslationStateItem } from './types'
import InlineButtons from './InlineButtons/index.vue'
import Dropdown from './Dropdown/index.vue'

defineProps<{
  activeLanguage: Language
}>()

const { eventBus, state, context, $t, ui, adapter } = useBlokkli()

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

function onClick(item: TranslationStateItem) {
  if (item.translation?.exists) {
    return adapter.changeLanguage!(item.translation)
  }

  if (item.translation) {
    eventBus.emit('translateEntity', item.translation)
  }
}
</script>
