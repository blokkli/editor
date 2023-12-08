<template>
  <Teleport to="#bk-toolbar-after-title">
    <div class="bk-blokkli-item-options-radios bk-is-language">
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
            @click="onClick(item, $event)"
          />
          <span>{{ item.code }}</span>
          <div class="bk-tooltip">{{ item.label }}</div>
        </div>
      </label>
    </div>
  </Teleport>

  <PluginMenuButton
    :title="text('translationsBatchTranslateMenuTitle')"
    :description="text('translationsBatchTranslateMenuDescription')"
    :disabled="editMode !== 'translating'"
    :weight="60"
    icon="translate"
    @click="eventBus.emit('batchTranslate')"
  />

  <PluginItemAction
    v-if="editMode === 'translating'"
    :title="text('translationsItemAction')"
    icon="translate"
    @click="onTranslate"
  />
</template>

<script lang="ts" setup>
import { falsy } from '#blokkli/helpers'
import { PluginMenuButton, PluginItemAction } from '#blokkli/plugins'
import type {
  DraggableExistingBlokkliItem,
  BlokkliEntityTranslation,
} from '#blokkli/types'

const { eventBus, state, context, adapter, text } = useBlokkli()
const { translation, editMode } = state

type TranslationStateItem = {
  id: string
  code: string
  label: string
  checked: boolean
  translation?: BlokkliEntityTranslation
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

function onTranslate(items: DraggableExistingBlokkliItem[]) {
  eventBus.emit('item:edit', {
    uuid: items[0].uuid,
    bundle: items[0].itemBundle,
  })
}
</script>
