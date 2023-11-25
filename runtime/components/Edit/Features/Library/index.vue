<template>
  <PluginSidebar id="library" title="Bibliothek" edit-only icon="reusable">
    <Pane />
  </PluginSidebar>

  <PluginParagraphAction
    title="Zur Bibliothek hinzufügen"
    @click="showReusableDialog = true"
    :disabled="!canMakeReusable"
    icon="reusable"
  />

  <Teleport to="body">
    <transition appear name="pb-slide-up" :duration="300">
      <ReusableDialog
        v-if="showReusableDialog && selectedParagraph"
        :uuid="selectedParagraph.uuid"
        :background-class="definition?.editBackgroundClass"
        @confirm="onMakeReusable"
        @cancel="showReusableDialog = false"
      />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { PluginSidebar, PluginParagraphAction } from '#pb/plugins'
import Pane from './Pane/index.vue'
import ReusableDialog from './ReusableDialog/index.vue'
import { definitions } from '#nuxt-paragraphs-builder/definitions'

const showReusableDialog = ref(false)

const {
  selectedParagraphs,
  allTypes,
  allowedTypesInList,
  mutateWithLoadingState,
  adapter,
} = useParagraphsBuilderStore()

const selectedParagraph = computed(() => {
  if (selectedParagraphs.value.length !== 1) {
    return
  }

  return selectedParagraphs.value[0]
})

const definition = computed(() => {
  return selectedParagraph?.value
    ? definitions.find(
        (v) => v.bundle === selectedParagraph.value?.paragraphType,
      )
    : null
})

const paragraphType = computed(() =>
  selectedParagraph?.value
    ? allTypes.value.find(
        (v) => v.id === selectedParagraph.value?.paragraphType,
      )
    : null,
)

const isReusable = computed(() => {
  return definition.value?.bundle === 'from_library'
})

function onMakeReusable(label: string) {
  showReusableDialog.value = false
  if (!selectedParagraph?.value?.uuid) {
    return
  }
  mutateWithLoadingState(
    adapter.makeParagraphReusable({
      label,
      uuid: selectedParagraph.value.uuid,
    }),
    'Der Abschnitt konnte nicht wiederverwendbar gemacht werden.',
  )
}

const canMakeReusable = computed(() => {
  return (
    !isReusable.value &&
    paragraphType?.value?.allowReusable &&
    allowedTypesInList.value.includes('from_library')
  )
})
</script>
