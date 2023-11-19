<template>
  <PluginSidebar id="library" title="Bibliothek" edit-only>
    <template #icon>
      <IconReusable />
    </template>
    <Pane />
  </PluginSidebar>

  <PluginParagraphAction
    title="Zur Bibliothek hinzufügen"
    @click="showReusableDialog = true"
    :disabled="!canMakeReusable"
  >
    <IconReusable />
  </PluginParagraphAction>

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
import PluginSidebar from './../../Plugin/Sidebar/index.vue'
import PluginParagraphAction from './../../Plugin/ParagraphAction/index.vue'
import Pane from './Pane/index.vue'
import IconReusable from './../../Icons/Reusable.vue'
import ReusableDialog from './ReusableDialog/index.vue'
import { definitions } from '#nuxt-paragraphs-builder/definitions'

const showReusableDialog = ref(false)

const { selectedParagraph, allTypes, allowedTypesInList, eventBus } =
  useParagraphsBuilderStore()

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
  eventBus.emit('makeReusable', {
    label,
    uuid: selectedParagraph.value.uuid,
  })
}

const canMakeReusable = computed(() => {
  return (
    !isReusable.value &&
    paragraphType?.value?.allowReusable &&
    allowedTypesInList.value.includes('from_library')
  )
})
</script>
