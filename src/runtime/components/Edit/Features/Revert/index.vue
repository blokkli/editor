<template>
  <PluginMenuButton
    :title="text('revertMenuTitle')"
    :description="text('revertMenuDescription')"
    type="danger"
    :disabled="!mutations.length || !canEdit"
    :weight="10"
    @click="showConfirm = true"
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
import { useBlokkli, ref, defineBlokkliFeature } from '#imports'
import { PluginMenuButton } from '#blokkli/plugins'
import { Icon, DialogModal } from '#blokkli/components'

const adapter = defineBlokkliFeature({
  requiredAdapterMethods: ['revertAllChanges'],
  description:
    'Provides a menu button to revert all changes done on the current entity.',
})

const { state, text } = useBlokkli()
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

<script lang="ts">
export default {
  name: 'Revert',
}
</script>
