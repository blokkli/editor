<template>
  <PluginSidebar
    id="library"
    :title="text('library')"
    edit-only
    icon="reusable"
  >
    <Pane />
  </PluginSidebar>

  <PluginItemAction
    :title="text('libraryAdd')"
    :disabled="!canMakeReusable"
    icon="reusable"
    :weight="-70"
    @click="showReusableDialog = true"
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

const { selection, state, adapter, types, text } = useBlokkli()

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
    text('libraryError'),
  )
}

const canMakeReusable = computed(
  () =>
    !isReusable.value &&
    itemBundle?.value?.allowReusable &&
    types.allowedTypesInList.value.includes('from_library'),
)
</script>
