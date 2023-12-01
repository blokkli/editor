<template>
  <Teleport to="#pb-toolbar-after-title">
    <div class="pb-paragraph-options-radios pb-is-language">
      <label
        v-for="item in items"
        :class="{ 'pb-is-muted': !item.translation }"
      >
        <div>
          <input
            type="radio"
            :checked="item.checked"
            :value="item.id"
            name="pb_language"
            @click="onClick(item, $event)"
          />
          <span>{{ item.code }}</span>
          <div class="pb-tooltip">{{ item.label }}</div>
        </div>
      </label>
    </div>
  </Teleport>

  <PluginMenuButton
    title="Übersetzen..."
    description="Alle Paragraphen übersetzen"
    @click="eventBus.emit('batchTranslate')"
    :disabled="editMode !== 'translating'"
    :weight="60"
    icon="translate"
  />

  <PluginParagraphAction
    title="Übersetzen"
    @click="onTranslateParagraph"
    v-if="editMode === 'translating'"
    icon="translate"
  />
</template>

<script lang="ts" setup>
import { falsy } from '#pb/helpers'
import { PluginMenuButton, PluginParagraphAction } from '#pb/plugins'
import {
  DraggableExistingParagraphItem,
  PbAvailableTranslation,
} from '#pb/types'

const { eventBus, state, context, adapter } = useBlokkli()
const { translation, editMode } = state

type TranslationStateItem = {
  id: string
  code: string
  label: string
  checked: boolean
  translation?: PbAvailableTranslation
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
  if (item.translation && adapter.changeLanguage) {
    return adapter.changeLanguage(item.translation)
  }

  event.preventDefault()
  eventBus.emit('translateEntity', item.id)
}

function onTranslateParagraph(paragraphs: DraggableExistingParagraphItem[]) {
  eventBus.emit('editParagraph', {
    uuid: paragraphs[0].uuid,
    bundle: paragraphs[0].paragraphType,
  })
}
</script>
