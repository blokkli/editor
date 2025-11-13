<template>
  <Teleport :to="ui.mainLayoutElement.value">
    <BlokkliTransition name="slide-up">
      <DialogModal
        v-if="showConfirm"
        id="revert"
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
    </BlokkliTransition>
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature } from '#imports'
import { DialogModal, BlokkliTransition } from '#blokkli/components'
import defineMenuButton from '#blokkli/helpers/composables/defineMenuButton'
import { useDialog } from '#blokkli/helpers/composables/useDialog'

const { adapter } = defineBlokkliFeature({
  id: 'revert',
  icon: 'revert',
  label: 'Revert',
  requiredAdapterMethods: ['revertAllChanges'],
  description:
    'Provides a menu button to revert all changes done on the current entity.',
})

const { state, $t, ui } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const showConfirm = useDialog('revert', 'center')

async function onSubmit() {
  await mutateWithLoadingState(
    () => adapter.revertAllChanges(),
    $t('revertError', 'Changes could not be discarded.'),
    $t('revertSuccess', 'All changes have been discarded.'),
  )
  showConfirm.value = false
}

defineMenuButton(() => {
  return {
    id: 'revert',
    title: $t('revertMenuTitle', 'Discard...'),
    description: $t(
      'revertMenuDescription',
      'Restore currently published state',
    ),
    icon: 'revert',
    type: 'danger',
    disabled: !mutations.value.length || !canEdit.value,
    weight: 10,
    callback: () => {
      showConfirm.value = true
    },
  }
})
</script>

<script lang="ts">
export default {
  name: 'Revert',
}
</script>
