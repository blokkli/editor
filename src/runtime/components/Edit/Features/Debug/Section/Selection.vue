<template>
  <div class="bk-debug-list">
    <div>
      <div>Count</div>
      <div>{{ selection.uuids.value.length }}</div>
    </div>
    <div>
      <div>isDragging</div>
      <div>{{ selection.isDragging.value }}</div>
    </div>
    <div>
      <div>isDraggingExisting</div>
      <div>{{ selection.isDraggingExisting.value }}</div>
    </div>
    <div>
      <div>Is multiselecting</div>
      <div>{{ selection.isMultiSelecting.value }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'

const { selection } = useBlokkli()
</script>
