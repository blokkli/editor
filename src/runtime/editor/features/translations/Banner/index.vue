<template>
  <Banner
    id="translate"
    icon="bk_mdi_translate"
    :text
    :button="$t('translationsBannerButton', 'Edit source language instead')"
    scheme="yellow"
    @click="onClick"
  />
</template>

<script setup lang="ts">
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import { Banner } from '#blokkli/editor/components'
import type { Language } from '#blokkli/editor/types/state'

const props = defineProps<{
  activeLanguage: Language
}>()

const { $t, adapter, state, ui } = useBlokkli()

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

onMounted(() => {
  ui.setSelectionColor('translating', 'mono')
})

onBeforeUnmount(() => {
  ui.removeSelectionColor('translating')
})
</script>
