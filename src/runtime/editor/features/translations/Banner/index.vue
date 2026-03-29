<template>
  <Banner
    id="translate"
    icon="bk_mdi_translate"
    :text
    :button="$t('translationsBannerButton', 'Edit source language instead')"
    scheme="yellow"
    @click="onClick"
  >
    <template #before>
      <TransitionHeight opacity :duration="300">
        <div v-if="outdatedUuids.length" class="pb-10">
          <div
            class="pb-10 border-b border-b-scheme-dark/40 flex justify-between items-center"
          >
            <div class="text-base" v-html="outdatedLabel" />
            <div class="flex gap-5 relative">
              <button
                class="bk-button bk-is-small bk-is-warning-outline-dark group/tooltip"
                @click.prevent="$emit('mark-all-up-to-date', outdatedUuids)"
              >
                {{
                  $t(
                    'translationsBannerMarkAllAsUpToDate',
                    'Mark all as up-to-date',
                  )
                }}
              </button>
              <button
                class="bk-button bk-is-small bk-is-warning-dark group/tooltip"
                @click.prevent="eventBus.emit('select:prev', outdatedUuids)"
              >
                <Icon name="bk_mdi_arrow_left_alt" />
                {{ $t('translationsBannerPrev', 'Previous block') }}
              </button>
              <button
                class="bk-button bk-is-small bk-is-warning-dark group/tooltip"
                @click.prevent="eventBus.emit('select:next', outdatedUuids)"
              >
                {{ $t('translationsBannerNext', 'Next block') }}
                <Icon name="bk_mdi_arrow_right_alt" />
              </button>
            </div>
          </div>
        </div>
      </TransitionHeight>
    </template>
  </Banner>
</template>

<script setup lang="ts">
import { computed, useBlokkli, onMounted, onBeforeUnmount } from '#imports'
import { Banner, Icon, TransitionHeight } from '#blokkli/editor/components'
import type { Language } from '#blokkli/editor/types/state'

const props = defineProps<{
  activeLanguage: Language
}>()

const { $t, adapter, state, ui, eventBus, blocks } = useBlokkli()

defineEmits<{
  (e: 'mark-all-up-to-date', uuids: string[]): void
}>()

const outdatedUuids = computed(() => {
  const lang = props.activeLanguage.id
  return blocks
    .getAllBlocks()
    .filter((b) => b.outdatedTranslations.includes(lang))
    .map((b) => b.uuid)
})

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

const outdatedLabel = computed(() => {
  const count = outdatedUuids.value.length
  if (!count) {
    return null
  }
  const key =
    count === 1
      ? $t(
          'translationsBannerOutdatedSingular',
          '@count block has an <strong>outdated translation</strong>.',
        )
      : $t(
          'translationsBannerOutdatedCount',
          '@count blocks have <strong>outdated translations</strong>.',
        )
  return key.replace('@count', String(count))
})

onMounted(() => {
  ui.setSelectionColor('translating', 'mono')
})

onBeforeUnmount(() => {
  ui.removeSelectionColor('translating')
})
</script>
