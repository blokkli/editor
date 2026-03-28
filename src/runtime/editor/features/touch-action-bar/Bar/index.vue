<template>
  <div class="bk bk-touch-action-bar bk-control">
    <button
      class="bk-button"
      :class="danger ? 'bk-is-danger' : 'bk-is-primary'"
      @click.stop.prevent.capture="$emit('click')"
    >
      {{ label }}
    </button>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  label: string
  danger?: boolean
}>()

defineEmits(['click'])
</script>

<script lang="ts">
export default {
  name: 'TouchActionBar',
}
</script>

<style lang="postcss">
.bk-touch-action-bar {
  @apply fixed bottom-0 left-0 w-full z-touch-action-bar bg-mono-900 h-50 pointer-events-auto;

  button {
    @apply w-full  h-full min-h-0 !rounded-none;
  }
}
</style>
