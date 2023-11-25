<template>
  <Teleport to="#pb-paragraph-actions-title">
    <div class="pb-paragraph-actions-type">
      <button
        class="pb-paragraph-actions-type-button"
        @click.prevent="showConversions = !showConversions"
        :disabled="!possibleConversions.length || !editingEnabled"
        :class="{
          'is-interactive': possibleConversions.length,
          'is-open': showConversions,
        }"
      >
        <div class="pb-paragraph-actions-title-icon">
          <ParagraphIcon v-if="paragraphType" :bundle="paragraphType.id" />
          <Icon name="selection" v-else />
        </div>
        <span>{{ title }}</span>
        <span
          class="pb-paragraph-actions-title-count"
          :class="{ 'pb-is-hidden': selectedParagraphs.length <= 1 }"
          >{{ selectedParagraphs.length }}</span
        >
        <Icon
          name="caret"
          v-if="possibleConversions.length && editingEnabled"
        />
      </button>
      <div
        v-if="possibleConversions.length"
        class="pb-paragraph-actions-type-dropdown"
      >
        <div v-if="showConversions">
          <h3>Umwandeln zu...</h3>
          <button
            @click.prevent="onConvert(conversion.id)"
            v-for="conversion in possibleConversions"
          >
            <div>
              <div
                v-if="conversion.id && icons[conversion.id]"
                v-html="icons[conversion.id]"
              />
            </div>
            <div>
              <div>{{ conversion.label }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { Icon } from '#pb/components'
import { ParagraphIcon } from '#pb/components'
import { icons } from '#nuxt-paragraphs-builder/definitions'
import { falsy, onlyUnique } from '#pb/helpers'
import type { PbType } from '#pb/types'

const showConversions = ref(false)

const {
  adapter,
  allTypes,
  selectedParagraphs,
  allowedTypesInList,
  editMode,
  mutateWithLoadingState,
} = useParagraphsBuilderStore()

const { data: conversionsData } = await useLazyAsyncData(() =>
  adapter.getConversions(),
)

const conversions = computed(() => conversionsData.value || [])

async function onConvert(targetBundle?: string) {
  if (!targetBundle) {
    return
  }

  await mutateWithLoadingState(
    adapter.convertParagraphs(
      selectedParagraphs.value.map((v) => v.uuid),
      targetBundle,
    ),
    'Der Abschnitt konnte nicht konvertiert werden.',
  )
}

const editingEnabled = computed(() => editMode.value === 'editing')

const paragraphTypeIds = computed(() => {
  return selectedParagraphs.value.map((v) => v.paragraphType).filter(onlyUnique)
})

const paragraphType = computed(() => {
  if (paragraphTypeIds.value.length !== 1) {
    return
  }
  return paragraphTypeIds.value
    ? allTypes.value.find((v) => v.id === paragraphTypeIds.value[0])
    : undefined
})

const title = computed(() => {
  if (paragraphType.value) {
    return paragraphType.value.label
  }

  return 'Paragraphen'
})

watch(selectedParagraphs, () => {
  showConversions.value = false
})

const possibleConversions = computed<PbType[]>(() => {
  if (paragraphTypeIds.value.length !== 1) {
    return []
  }
  const sourceType = paragraphTypeIds.value[0]
  return conversions.value
    .filter(
      (v) =>
        v.sourceBundle === sourceType &&
        allowedTypesInList.value.includes(v.targetBundle),
    )
    .map((v) => allTypes.value.find((t) => t.id === v.targetBundle))
    .filter(falsy)
})
</script>
