<template>
  <ArtboardTooltip
    id="drop-languages"
    :title
    :anchor-coordinates
    class="bk-drop-languages"
    data-test="drop-languages"
    @close="$emit('close')"
  >
    <div class="flex flex-col gap-10 p-15 min-w-[280px]">
      <p class="text-sm text-mono-200">
        {{
          $t(
            'draggingOverlayLanguagesDescription',
            'This field can differ per language.',
          )
        }}
      </p>
      <button
        ref="allButton"
        type="button"
        class="bk-button bk-scheme-accent bk-is-small bk-is-fullwidth"
        data-test="drop-languages-all"
        @click="$emit('select', true)"
      >
        {{ $t('draggingOverlayAllLanguages', 'All languages') }}
      </button>
      <button
        type="button"
        class="bk-button bk-scheme-mono bk-is-small bk-is-fullwidth"
        data-test="drop-languages-source"
        :data-test-language="sourceLanguage"
        @click="$emit('select', false)"
      >
        {{
          $t('draggingOverlayOnlyLanguage', 'Only @language').replace(
            '@language',
            sourceLanguageName,
          )
        }}
      </button>
    </div>
  </ArtboardTooltip>
</template>

<script setup lang="ts">
import { computed, onMounted, useBlokkli, useTemplateRef } from '#imports'
import { ArtboardTooltip } from '#blokkli/editor/components'
import type { Coord } from '#blokkli/editor/types/geometry'

defineProps<{
  title: string
  anchorCoordinates: Coord
}>()

defineEmits<{
  (e: 'select', allLanguages: boolean): void
  (e: 'close'): void
}>()

const { state, $t } = useBlokkli()

const sourceLanguage = computed(
  () => state.translation.value.sourceLanguage ?? '',
)

const sourceLanguageName = computed(
  () =>
    state.translation.value.availableLanguages?.find(
      (v) => v.id === sourceLanguage.value,
    )?.name || sourceLanguage.value,
)

const allButton = useTemplateRef('allButton')

onMounted(() => {
  // The focus trap would focus the close button: "All languages" is the
  // likely answer.
  allButton.value?.focus()
})
</script>

<style lang="postcss">
.bk.bk-drop-languages {
  --bk-bg: theme('colors.mono.900');
  --bk-header-bg: theme('colors.mono.800');
  --bk-header-hover: theme('colors.mono.700');
  --bk-header-text: theme('colors.mono.100');
  --bk-border: theme('colors.mono.500');
}
</style>
