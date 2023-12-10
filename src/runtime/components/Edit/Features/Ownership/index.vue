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
import { computed, useBlokkli } from '#imports'

const { adapter, state, text } = useBlokkli()

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
