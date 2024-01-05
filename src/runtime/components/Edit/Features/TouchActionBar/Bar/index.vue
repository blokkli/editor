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
