<template>
  <Teleport to="body">
    <div
      v-if="!state.owner.value?.currentUserIsOwner"
      class="bk-owner-indicator"
    >
      <p v-html="text('ownershipNote').replace('@name', name)" />
      <button class="bk-button is-danger" @click="takeOwnership">
        {{ text('ownershipTakeOwnership') }}
      </button>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'

const adapter = defineBlokkliFeature({
  requiredAdapterMethods: ['takeOwnership'],
  description:
    'Renders a large button to take ownership of the current edit state.',
})

const { state, text } = useBlokkli()

const takeOwnership = () =>
  state.mutateWithLoadingState(
    adapter.takeOwnership(),
    text('ownershipError'),
    text('ownershipSuccess'),
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
