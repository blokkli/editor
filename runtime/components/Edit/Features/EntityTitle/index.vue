<template>
  <Teleport to="#bk-toolbar-title">
    <button class="bk-toolbar-button" @click="eventBus.emit('editEntity')">
      <div class="bk-toolbar-title">
        <div>
          <span
            class="bk-status-indicator"
            :class="{
              'bk-is-success': entity.status && !mutations.length,
              'bk-is-warning': entity.status && mutations.length,
            }"
          ></span>
          <strong>{{ entity.label }}</strong>
          <span>&nbsp;{{ entity.bundleLabel }}</span>
        </div>
      </div>
      <div class="bk-tooltip">
        <span v-if="entity.status && !mutations.length"
          >Seite ist publiziert</span
        >
        <span v-else-if="entity.status && mutations.length"
          >Seite ist publiziert (Änderungen ausstehend)</span
        >
        <span v-else>Seite ist nicht publiziert</span>
      </div>
    </button>
  </Teleport>
</template>

<script lang="ts" setup>
const { state, eventBus } = useBlokkli()
const { entity, mutations } = state
</script>
