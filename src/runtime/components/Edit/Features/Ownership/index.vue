<template>
  <Teleport to="#bk-banner-list">
    <Renderer v-if="shouldRender" @submit="takeOwnership" />
  </Teleport>
</template>

<script lang="ts" setup>
import { useBlokkli, defineBlokkliFeature, computed } from '#imports'
import Renderer from './Renderer.vue'

const { adapter } = defineBlokkliFeature({
  id: 'ownership',
  icon: 'user',
  label: 'Ownership',
  requiredAdapterMethods: ['takeOwnership'],
  description:
    'Renders a large button to take ownership of the current edit state.',
})

const { state, $t } = useBlokkli()

const shouldRender = computed<boolean>(
  () => !state.owner.value?.currentUserIsOwner,
)

const takeOwnership = () =>
  state.mutateWithLoadingState(
    () => adapter.takeOwnership(),
    $t('ownershipError', 'Error in assigning'),
    $t('ownershipSuccess', 'You are now the owner.'),
  )
</script>

<script lang="ts">
export default {
  name: 'Ownership',
}
</script>
