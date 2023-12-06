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
        <span v-if="entity.status && !mutations.length">{{
          text('pageIsPublished')
        }}</span>
        <span v-else-if="entity.status && mutations.length">{{
          text('pageIsPublishedWithPendingChanges')
        }}</span>
        <span v-else>{{ text('pageIsNotPublished') }}</span>
      </div>
    </button>
  </Teleport>
</template>

<script lang="ts" setup>
const { state, eventBus, text } = useBlokkli()
const { entity, mutations } = state
</script>
