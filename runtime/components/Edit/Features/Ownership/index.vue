<template>
  <Teleport to="body">
    <div v-if="!currentUserIsOwner" class="pb-owner-indicator">
      <p>
        Diese Seite wird aktuell von
        <strong>{{ ownerName }}</strong> bearbeitet. Änderungen können nur von
        einer Person gleichzeitig durchgeführt werden.
      </p>
      <button class="pb-button is-danger" @click="takeOwnership">
        Mir zuweisen
      </button>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
const { ownerName, currentUserIsOwner, takeOwnership } =
  useParagraphsBuilderStore()
</script>
