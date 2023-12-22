<template>
  <PluginItemAction
    :title="text('libraryAdd')"
    :disabled="!canMakeReusable"
    icon="reusable"
    :weight="-70"
    @click="showReusableDialog = true"
  />

  <PluginAddAction
    type="library"
    title="From Library"
    icon="reusable"
    color="lime"
    @placed="placedAction = $event"
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

  <Teleport to="body">
    <transition appear name="bk-slide-up" :duration="300">
      <LibraryDialog
        v-if="placedAction"
        :field="placedAction.field"
        @close="placedAction = null"
        @submit="onAddLibraryItem"
      />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli } from '#imports'

import { PluginItemAction, PluginAddAction } from '#blokkli/plugins'
import ReusableDialog from './ReusableDialog/index.vue'
import LibraryDialog from './LibraryDialog/index.vue'
import { getDefinition } from '#blokkli/definitions'
import type { ActionPlacedEvent } from '#blokkli/types'

const showReusableDialog = ref(false)

const { selection, state, adapter, types, text } = useBlokkli()

const selectedItem = computed(() => {
  if (selection.blocks.value.length !== 1) {
    return
  }

  return selection.blocks.value[0]
})

const placedAction = ref<ActionPlacedEvent | null>(null)
const onAddLibraryItem = async (uuid: string) => {
  if (!placedAction.value) {
    return
  }
  await state.mutateWithLoadingState(
    adapter.addReusableItem({
      libraryItemUuid: uuid,
      host: placedAction.value.host,
      afterUuid: placedAction.value.preceedingUuid,
    }),
  )
  placedAction.value = null
}

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

const fromLibraryAllowedInList = computed(() => {
  return types.allowedTypesInList.value.includes('from_library')
})

const canMakeReusable = computed(
  () =>
    !isReusable.value &&
    itemBundle?.value?.allowReusable &&
    fromLibraryAllowedInList.value,
)
</script>

<script lang="ts">
export default {
  name: 'Library',
}
</script>
