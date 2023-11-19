<template>
  <Teleport to="#pb-toolbar-title">
    <button class="pb-toolbar-button" @click="eventBus.emit('editEntity')">
      <div class="pb-toolbar-title">
        <div>
          <span
            class="pb-status-indicator"
            :class="{
              'pb-is-success': entity.status && !mutations.length,
              'pb-is-warning': entity.status && mutations.length,
            }"
          ></span>
          <strong>{{ entity.label }}</strong>
          <span>&nbsp;{{ entity.bundleLabel }}</span>
        </div>
      </div>
      <div class="pb-tooltip">
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
const { entity, mutations, eventBus } = useParagraphsBuilderStore()
</script>
