<template>
  <PluginMenuButton
    :title="$t('revertMenuTitle')"
    :description="$t('revertMenuDescription')"
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
        :title="$t('revertDialogTitle')"
        :lead="$t('revertDialogLead')"
        :submit-label="$t('revertDialogSubmit')"
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

const { state, $t } = useBlokkli()
const { mutations, canEdit, mutateWithLoadingState } = state

const showConfirm = ref(false)

async function onSubmit() {
  await mutateWithLoadingState(
    adapter.revertAllChanges(),
    $t('revertError'),
    $t('revertSuccess'),
  )
  showConfirm.value = false
}
</script>

<script lang="ts">
export default {
  name: 'Revert',
}
</script>
