<template>
  <Teleport to="#bk-toolbar-after-title">
    <div
      v-if="items.length"
      class="bk-translations"
      :class="{ 'bk-is-dropdown': isDropdown }"
    >
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
  </Teleport>

  <PluginMenuButton
    :title="$t('translationsBatchTranslateMenuTitle')"
    :description="$t('translationsBatchTranslateMenuDescription')"
    :disabled="editMode !== 'translating'"
    :weight="60"
    icon="translate"
    @click="eventBus.emit('batchTranslate')"
  />

  <PluginItemAction
    v-if="editMode === 'translating'"
    :title="$t('translationsItemAction')"
    icon="translate"
    @click="onTranslate"
  />
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { falsy } from '#blokkli/helpers'
import { PluginMenuButton, PluginItemAction } from '#blokkli/plugins'
import type { DraggableExistingBlock, EntityTranslation } from '#blokkli/types'

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
