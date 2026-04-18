<template>
  <Teleport to="#bk-banner-list">
    <OwnershipBanner
      v-if="shouldRender"
      :can-take-ownership
      @submit="takeOwnership"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import OwnershipBanner from './Banner/index.vue'

const { adapter } = defineBlokkliFeature({
  id: 'ownership',
  icon: 'bk_mdi_person-fill',
  label: 'Ownership',
  requiredAdapterMethods: ['takeOwnership'],
  description:
    'Renders a large button to take ownership of the current edit state.',
})

const { state, $t, permissions } = useBlokkli()

const shouldRender = computed<boolean>(
  () =>
    state.stateAvailable.value &&
    !state.owner.value?.currentUserIsOwner &&
    state.permissions.value.includes('edit'),
)

const canTakeOwnership = computed<boolean>(() =>
  permissions.hasPermission('take_ownership'),
)

function takeOwnership() {
  if (!canTakeOwnership.value) {
    return
  }
  state.mutateWithLoadingState(
    () => adapter.takeOwnership(),
    $t('ownershipError', 'Error in assigning'),
    $t('ownershipSuccess', 'You are now the owner.'),
  )
}
</script>

<script lang="ts">
export default {
  name: 'Ownership',
}
</script>
