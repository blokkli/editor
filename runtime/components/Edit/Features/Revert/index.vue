<template>
  <PluginMenuButton
    :title="text('revertMenuTitle')"
    :description="text('revertMenuDescription')"
    type="danger"
    @click="showConfirm = true"
    :disabled="!mutations.length || !canEdit"
    :weight="10"
  >
    <Icon name="revert" />
  </PluginMenuButton>

  <Teleport to="body">
    <transition appear name="bk-slide-up">
      <DialogModal
        v-if="showConfirm"
        :title="text('revertDialogTitle')"
        :lead="text('revertDialogLead')"
        :submit-label="text('revertDialogSubmit')"
        is-danger
        @submit="onSubmit"
        @cancel="showConfirm = false"
      />
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { PluginMenuButton } from '#blokkli/plugins'
import { Icon, DialogModal } from '#blokkli/components'

const { adapter, state, text } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const showConfirm = ref(false)

async function onSubmit() {
  await mutateWithLoadingState(
    adapter.revertAllChanges(),
    text('revertError'),
    text('revertSuccess'),
  )
  showConfirm.value = false
}
</script>
