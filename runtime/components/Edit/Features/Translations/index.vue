<template>
  <Teleport to="#pb-toolbar-after-title">
    <div class="pb-paragraph-options-radios pb-is-language">
      <label v-for="item in items" :class="{ 'pb-is-muted': !item.exists }">
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
  >
    <IconTranslate />
  </PluginMenuButton>

  <PluginParagraphAction
    title="Übersetzen"
    @click="onTranslateParagraph"
    v-if="editMode === 'translating'"
  >
    <IconTranslate />
  </PluginParagraphAction>
</template>

<script lang="ts" setup>
import { falsy } from '../../helpers'
import PluginMenuButton from './../../Plugin/MenuButton/index.vue'
import PluginParagraphAction from './../../Plugin/ParagraphAction/index.vue'
import IconTranslate from './../../Icons/Translate.vue'

const {
  translationState,
  currentLanguage,
  eventBus,
  editMode,
  selectedParagraph,
} = useParagraphsBuilderStore()

type TranslationStateItem = {
  id: string
  code: string
  label: string
  exists: boolean
  checked: boolean
}

const items = computed<TranslationStateItem[]>(() => {
  return (translationState.value.availableLanguages || [])
    .map((language) => {
      if (language && language.id) {
        return {
          id: language.id,
          code: language.id.toUpperCase(),
          label: language.name,
          checked: currentLanguage.value === language.id,
          exists: (translationState.value.translations || []).includes(
            language.id,
          ),
        }
      }
      return null
    })
    .filter(falsy)
})

function onClick(item: TranslationStateItem, event: Event) {
  if (item.exists) {
    return (currentLanguage.value = item.id)
  }

  event.preventDefault()
  eventBus.emit('translateEntity', item.id)
}

function onTranslateParagraph() {
  if (!selectedParagraph.value) {
    return
  }

  eventBus.emit('editParagraph', {
    uuid: selectedParagraph.value.uuid,
    bundle: selectedParagraph.value.paragraphType,
  })
}
</script>
