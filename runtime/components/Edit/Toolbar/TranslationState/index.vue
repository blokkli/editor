<template>
  <div class="pb-toolbar-container">
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
  </div>
</template>

<script lang="ts" setup>
import { falsy } from '../../helpers'
import type {
  PbAvailableLanguage,
  PbEditEntityTranslation,
} from './../../../../types'

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'translateEntity', langcode: string): void
}>()

const props = defineProps<{
  isTranslatable: boolean
  sourceLanguage?: string | undefined
  availableLanguages: PbAvailableLanguage[]
  translations: string[]
  modelValue: string
  entityTranslations: PbEditEntityTranslation[]
}>()

type TranslationStateItem = {
  id: string
  code: string
  label: string
  exists: boolean
  checked: boolean
}

const items = computed<TranslationStateItem[]>(() => {
  return props.availableLanguages
    .map((language) => {
      if (language && language.id) {
        return {
          id: language.id,
          code: language.id.toUpperCase(),
          label: language.name,
          checked: props.modelValue === language.id,
          exists: props.translations.includes(language.id),
        }
      }
      return null
    })
    .filter(falsy)
})

function onClick(item: TranslationStateItem, event: Event) {
  if (item.exists) {
    return emit('update:modelValue', item.id)
  }
  event.preventDefault()
  return emit('translateEntity', item.id)
}
</script>
