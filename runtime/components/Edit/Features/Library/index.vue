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
        v-if="showReusableDialog && selectedBlock"
        :uuid="selectedBlock.uuid"
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
import { getDefinition } from '#nuxt-paragraphs-builder/definitions'

const showReusableDialog = ref(false)

const { selection, state, adapter, types } = useBlokkli()

const selectedBlock = computed(() => {
  if (selection.blocks.value.length !== 1) {
    return
  }

  return selection.blocks.value[0]
})

const definition = computed(() =>
  selectedBlock?.value
    ? getDefinition(selectedBlock.value.paragraphType)
    : null,
)

const paragraphType = computed(() =>
  selectedBlock?.value
    ? types.allTypes.value.find(
        (v) => v.id === selectedBlock.value?.paragraphType,
      )
    : null,
)

const isReusable = computed(() => definition.value?.bundle === 'from_library')

function onMakeReusable(label: string) {
  showReusableDialog.value = false
  if (!selectedBlock?.value?.uuid) {
    return
  }
  state.mutateWithLoadingState(
    adapter.makeParagraphReusable({
      label,
      uuid: selectedBlock.value.uuid,
    }),
    'Der Abschnitt konnte nicht wiederverwendbar gemacht werden.',
  )
}

const canMakeReusable = computed(
  () =>
    !isReusable.value &&
    paragraphType?.value?.allowReusable &&
    types.allowedTypesInList.value.includes('from_library'),
)
</script>
