<template>
  <div class="bk bk-translations-banner">
    <Icon name="translate" />
    <div v-html="text" />
    <button class="bk-translations-banner-close" @click="onClick">
      {{ $t('translationsBannerButton', 'Edit source language instead') }}
      <Icon name="close" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import type { Language } from '#blokkli/types'

const props = defineProps<{
  activeLanguage: Language
}>()

const { $t, adapter, state } = useBlokkli()

const onClick = () => {
  const sourceLanguage = state.translation.value.sourceLanguage
  if (!sourceLanguage) {
    throw new Error(
      'Missing property "sourceLanguage" in TranslationState object.',
    )
  }

  const sourceTranslation = state.translation.value.translations?.find(
    (v) => v.id === sourceLanguage,
  )

  if (!sourceTranslation) {
    throw new Error(
      `Failed to find translation for language "${sourceLanguage}".`,
    )
  }

  adapter.changeLanguage!(sourceTranslation)
}

const text = computed(() => {
  return $t(
    'translationsBannerText',
    'You are currently editing the <strong>@language</strong> translation. Some features like adding, moving or deleting blocks are not available.',
  ).replace('@language', props.activeLanguage.name)
})
</script>
