<template>
  <PluginMenuButton
    v-if="state.mutatedFields.value.length"
    :title="text('importExistingTitle')"
    :description="text('importExistingDescription')"
    :disabled="state.editMode.value !== 'editing'"
    :weight="50"
    @click="showModal = true"
  >
    <Icon name="import" />
  </PluginMenuButton>

  <Teleport to="body">
    <transition appear name="bk-slide-up">
      <ExistingDialog
        v-if="showModal"
        @confirm="onSubmit($event.sourceUuid, $event.fields)"
        @cancel="showModal = false"
      />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, useBlokkli, onMounted } from '#imports'

import { PluginMenuButton } from '#blokkli/plugins'
import { Icon } from '#blokkli/components'
import ExistingDialog from './Dialog/index.vue'

const { adapter, storage, state, text } = useBlokkli()

const shouldOpen = storage.use('showImport', true)

const isEmpty = computed(
  () => !state.mutatedFields.value.find((v) => v.field.list?.length),
)

const showModal = ref(false)

function onSubmit(sourceUuid: string, sourceFields: string[]) {
  showModal.value = false
  state.mutateWithLoadingState(
    adapter.importFromExisting({
      sourceFields,
      sourceUuid,
    }),
    text('importExistingError'),
    text('importExistingSuccess'),
  )
}

onMounted(() => {
  // Show the import dialog when there are no items yet and no mutations.
  if (isEmpty.value && !state.mutations.value.length && shouldOpen.value) {
    showModal.value = true
  }
})
</script>
