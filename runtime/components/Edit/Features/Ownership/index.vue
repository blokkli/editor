<template>
  <Teleport to="body">
    <div
      v-if="!state.owner.value?.currentUserIsOwner"
      class="pb-owner-indicator"
    >
      <p>
        Diese Seite wird aktuell von
        <strong>{{ state.owner.value?.name }}</strong> bearbeitet. Änderungen
        können nur von einer Person gleichzeitig durchgeführt werden.
      </p>
      <button class="pb-button is-danger" @click="takeOwnership">
        Mir zuweisen
      </button>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
const { adapter, state } = useBlokkli()

const takeOwnership = () =>
  state.mutateWithLoadingState(
    adapter.takeOwnership(),
    'Fehler beim Zuweisen.',
    'Sie sind nun der Besitzer.',
  )
</script>
