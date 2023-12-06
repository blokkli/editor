<template>
  <PluginSidebar id="library" title="Bibliothek" edit-only icon="reusable">
    <Pane />
  </PluginSidebar>

  <PluginItemAction
    title="Zur Bibliothek hinzufügen"
    @click="showReusableDialog = true"
    :disabled="!canMakeReusable"
    icon="reusable"
  />

  <Teleport to="body">
    <transition appear name="bk-slide-up" :duration="300">
      <ReusableDialog
        v-if="showReusableDialog && selectedItem"
        :uuid="selectedItem.uuid"
        :background-class="definition?.editBackgroundClass"
        @confirm="onMakeReusable"
        @cancel="showReusableDialog = false"
      />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { PluginSidebar, PluginItemAction } from '#blokkli/plugins'
import Pane from './Pane/index.vue'
import ReusableDialog from './ReusableDialog/index.vue'
import { getDefinition } from '#blokkli/definitions'

const showReusableDialog = ref(false)

const { selection, state, adapter, types } = useBlokkli()

const selectedItem = computed(() => {
  if (selection.blocks.value.length !== 1) {
    return
  }

  return selection.blocks.value[0]
})

const definition = computed(() =>
  selectedItem?.value ? getDefinition(selectedItem.value.itemBundle) : null,
)

const itemBundle = computed(() =>
  selectedItem?.value
    ? types.allTypes.value.find((v) => v.id === selectedItem.value?.itemBundle)
    : null,
)

const isReusable = computed(() => definition.value?.bundle === 'from_library')

function onMakeReusable(label: string) {
  showReusableDialog.value = false
  if (!selectedItem?.value?.uuid) {
    return
  }
  state.mutateWithLoadingState(
    adapter.makeItemReusable({
      label,
      uuid: selectedItem.value.uuid,
    }),
    'Der Abschnitt konnte nicht wiederverwendbar gemacht werden.',
  )
}

const canMakeReusable = computed(
  () =>
    !isReusable.value &&
    itemBundle?.value?.allowReusable &&
    types.allowedTypesInList.value.includes('from_library'),
)
</script>
