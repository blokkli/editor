<template>
  <PluginMenuButton
    id="revert"
    :title="$t('revertMenuTitle', 'Discard...')"
    :description="
      $t('revertMenuDescription', 'Restore currently published state')
    "
    icon="revert"
    type="danger"
    :disabled="!mutations.length || !canEdit"
    :weight="10"
    @click="showConfirm = true"
  />

  <Teleport to="body">
    <transition appear name="bk-slide-up">
      <DialogModal
        v-if="showConfirm"
        :title="$t('revertDialogTitle', 'Irrevocably discard changes')"
        :lead="
          $t(
            'revertDialogLead',
            'This will delete all changes and restore the currently published state. This action cannot be undone.',
          )
        "
        :submit-label="$t('revertDialogSubmit', 'Discard changes')"
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
import { DialogModal } from '#blokkli/components'

const { adapter } = defineBlokkliFeature({
  id: 'revert',
  icon: 'revert',
  label: 'Revert',
  requiredAdapterMethods: ['revertAllChanges'],
  description:
    'Provides a menu button to revert all changes done on the current entity.',
})

const { state, $t } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const showConfirm = ref(false)

async function onSubmit() {
  await mutateWithLoadingState(
    () => adapter.revertAllChanges(),
    $t('revertError', 'Changes could not be discarded.'),
    $t('revertSuccess', 'All changes have been discarded.'),
  )
  showConfirm.value = false
}
</script>

<script lang="ts">
export default {
  name: 'Revert',
}
</script>
