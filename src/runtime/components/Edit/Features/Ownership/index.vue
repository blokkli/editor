<template>
  <Teleport to="body">
    <div
      v-if="!state.owner.value?.currentUserIsOwner"
      class="bk-owner-indicator"
    >
      <p
        v-html="
          $t(
            'ownershipNote',
            'This page is currently being edited by @name. Changes can only be made by one person at a time.',
          ).replace('@name', name)
        "
      />
      <button class="bk-button is-danger" @click="takeOwnership">
        {{ $t('ownershipTakeOwnership', 'Assign to me') }}
      </button>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'

const { adapter } = defineBlokkliFeature({
  id: 'ownership',
  icon: 'user',
  label: 'Ownership',
  requiredAdapterMethods: ['takeOwnership'],
  description:
    'Renders a large button to take ownership of the current edit state.',
})

const { state, $t } = useBlokkli()

const takeOwnership = () =>
  state.mutateWithLoadingState(
    adapter.takeOwnership(),
    $t('ownershipError', 'Error in assigning'),
    $t('ownershipSuccess', 'You are now the owner.'),
  )

const name = computed(() => {
  const v = state.owner.value?.name
  if (v) {
    return `<strong>${v}</strong>`
  }

  return ''
})
</script>

<script lang="ts">
export default {
  name: 'Ownership',
}
</script>
