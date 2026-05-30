<template>
  <div id="bk-toolbar-view-options" class="bk-toolbar-container">
    <ViewOptionButton v-for="vo in viewOptions" :key="vo.id" v-bind="vo" />
  </div>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import ViewOptionButton from './Button/index.vue'

const { plugins } = useBlokkli()

const viewOptions = computed(() => plugins.get('viewOption'))
</script>

<script lang="ts">
export default {
  name: 'ToolbarViewOptions',
}
</script>
