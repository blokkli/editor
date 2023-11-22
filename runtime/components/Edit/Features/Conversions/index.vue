<template>
  <Teleport to="#pb-paragraph-actions-title">
    <div v-if="paragraphType" class="pb-paragraph-actions-type">
      <button
        class="pb-paragraph-actions-type-button"
        @click.prevent="showConversions = !showConversions"
        :disabled="!possibleConversions.length || !editingEnabled"
        :class="{
          'is-interactive': possibleConversions.length,
          'is-open': showConversions,
        }"
      >
        <ParagraphIcon :bundle="paragraphType.id" />
        <span>{{ paragraphType.label }}</span>
        <IconCaret v-if="possibleConversions.length && editingEnabled" />
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
import IconCaret from './../../Icons/Caret.vue'
import ParagraphIcon from './../../ParagraphIcon/index.vue'
import { icons } from '#nuxt-paragraphs-builder/definitions'
import { falsy } from './../../helpers'
import { PbType } from '../../../../types'

const showConversions = ref(false)

const {
  conversions,
  allTypes,
  selectedParagraph,
  allowedTypesInList,
  editMode,
  eventBus,
} = useParagraphsBuilderStore()

function onConvert(targetBundle?: string) {
  if (!targetBundle || !selectedParagraph.value?.uuid) {
    return
  }

  eventBus.emit('paragraph:convert', {
    uuid: selectedParagraph.value.uuid,
    targetBundle,
  })
}

const editingEnabled = computed(() => editMode.value === 'editing')

const paragraphTypeId = computed(() => selectedParagraph.value?.paragraphType)
const paragraphType = computed(() =>
  paragraphTypeId.value
    ? allTypes.value.find((v) => v.id === paragraphTypeId.value)
    : undefined,
)

watch(
  () => selectedParagraph.value?.uuid,
  () => {
    showConversions.value = false
  },
)

const possibleConversions = computed<PbType[]>(() => {
  return conversions.value
    .filter(
      (v) =>
        v.sourceBundle === selectedParagraph.value?.paragraphType &&
        allowedTypesInList.value.includes(v.targetBundle),
    )
    .map((v) => allTypes.value.find((t) => t.id === v.targetBundle))
    .filter(falsy)
})
</script>
