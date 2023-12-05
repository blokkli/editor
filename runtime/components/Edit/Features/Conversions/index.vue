<template>
  <Teleport to="#bk-paragraph-actions-title">
    <div class="bk-paragraph-actions-type">
      <button
        class="bk-paragraph-actions-type-button"
        @click.prevent="showConversions = !showConversions"
        :disabled="!possibleConversions.length || !editingEnabled"
        :class="{
          'is-interactive': possibleConversions.length,
          'is-open': showConversions,
        }"
      >
        <div class="bk-paragraph-actions-title-icon">
          <ParagraphIcon v-if="paragraphType" :bundle="paragraphType.id" />
          <Icon name="selection" v-else />
        </div>
        <span>{{ title }}</span>
        <span
          class="bk-paragraph-actions-title-count"
          :class="{ 'bk-is-hidden': selection.blocks.value.length <= 1 }"
          >{{ selection.blocks.value.length }}</span
        >
        <Icon
          name="caret"
          class="bk-caret"
          v-if="possibleConversions.length && editingEnabled"
        />
      </button>
    </div>
  </Teleport>
  <Teleport to="#bk-paragraph-actions-after">
    <div
      v-if="possibleConversions.length && showConversions"
      class="bk-paragraph-actions-type-dropdown"
    >
      <div>
        <h3>Umwandeln zu...</h3>
        <button
          @click.prevent="onConvert(conversion.id)"
          v-for="conversion in possibleConversions"
        >
          <ParagraphIcon :bundle="conversion.id" />
          <div>
            <div>{{ conversion.label }}</div>
          </div>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/components'
import { ParagraphIcon } from '#blokkli/components'
import { falsy, onlyUnique } from '#blokkli/helpers'
import type { BlokkliItemType } from '#blokkli/types'

const showConversions = ref(false)

const { adapter, types, selection, state } = useBlokkli()

const { data: conversionsData } = await useLazyAsyncData(() =>
  adapter.getConversions(),
)

const conversions = computed(() => conversionsData.value || [])

async function onConvert(targetBundle?: string) {
  if (!targetBundle) {
    return
  }

  await state.mutateWithLoadingState(
    adapter.convertParagraphs(
      selection.blocks.value.map((v) => v.uuid),
      targetBundle,
    ),
    'Der Abschnitt konnte nicht konvertiert werden.',
  )
}

const editingEnabled = computed(() => state.editMode.value === 'editing')

const paragraphTypeIds = computed(() => {
  return selection.blocks.value.map((v) => v.paragraphType).filter(onlyUnique)
})

const paragraphType = computed(() => {
  if (paragraphTypeIds.value.length !== 1) {
    return
  }
  return paragraphTypeIds.value
    ? types.allTypes.value.find((v) => v.id === paragraphTypeIds.value[0])
    : undefined
})

const title = computed(() => {
  if (paragraphType.value) {
    return paragraphType.value.label
  }

  return 'Paragraphen'
})

watch(selection.blocks, () => {
  showConversions.value = false
})

const possibleConversions = computed<BlokkliItemType[]>(() => {
  if (paragraphTypeIds.value.length !== 1) {
    return []
  }
  const sourceType = paragraphTypeIds.value[0]
  return conversions.value
    .filter(
      (v) =>
        v.sourceBundle === sourceType &&
        types.allowedTypesInList.value.includes(v.targetBundle),
    )
    .map((v) => types.allTypes.value.find((t) => t.id === v.targetBundle))
    .filter(falsy)
})
</script>
