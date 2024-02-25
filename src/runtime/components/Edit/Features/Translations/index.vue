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
      <div class="bk-translations" :class="{ 'bk-is-dropdown': isDropdown }">
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
            :class="{ 'bk-is-muted': !item.translation }"
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

  <Teleport to="body">
    <Banner
      v-if="state.editMode.value === 'translating'"
      :active-language="activeLanguage"
    />
  </Teleport>

  <PluginMenuButton
    id="translations"
    :title="$t('translationsBatchTranslateMenuTitle', 'Translate...')"
    :description="
      $t('translationsBatchTranslateMenuDescription', 'Translate all blocks')
    "
    :disabled="editMode !== 'translating'"
    :weight="60"
    icon="translate"
    @click="eventBus.emit('batchTranslate')"
  />

  <PluginItemAction
    v-if="editMode === 'translating'"
    id="translate"
    :title="$t('translationsItemAction', 'Translate')"
    icon="translate"
    @click="onTranslate"
  />
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { falsy } from '#blokkli/helpers'
import {
  PluginMenuButton,
  PluginItemAction,
  PluginTourItem,
} from '#blokkli/plugins'
import type {
  DraggableExistingBlock,
  EntityTranslation,
  Language,
} from '#blokkli/types'
import Banner from './Banner/index.vue'

const { adapter } = defineBlokkliFeature({
  id: 'translations',
  label: 'Translations',
  icon: 'translate',
  requiredAdapterMethods: ['changeLanguage'],
  description: 'Adds support for block translations.',
})

const { eventBus, state, context, $t, ui } = useBlokkli()
const { translation, editMode } = state

const isDropdown = computed(() => ui.isMobile.value || items.value.length > 5)

const isOpen = ref(false)

const activeLangcode = computed(() => context.value.language)
const activeLanguage = computed<Language>(() => {
  return (
    translation.value.availableLanguages?.find(
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
  return (translation.value.availableLanguages || [])
    .map((language) => {
      if (language && language.id) {
        return {
          id: language.id,
          code: language.id.toUpperCase(),
          label: language.name,
          checked: context.value.language === language.id,
          translation: (translation.value.translations || []).find(
            (v) => v.id === language.id,
          ),
        }
      }
      return null
    })
    .filter(falsy)
})

function onClick(item: TranslationStateItem, event: Event) {
  if (item.translation) {
    return adapter.changeLanguage(item.translation)
  }

  event.preventDefault()
  eventBus.emit('translateEntity', item.id)
}

function onTranslate(items: DraggableExistingBlock[]) {
  eventBus.emit('item:edit', {
    uuid: items[0].uuid,
    bundle: items[0].itemBundle,
  })
}
</script>

<script lang="ts">
export default {
  name: 'Translations',
}
</script>
