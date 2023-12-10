<template>
  <div class="bk-blokkli-item-options-text">
    <input v-model="text" :type="type" :placeholder="label" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'

const props = withDefaults(
  defineProps<{
    label: string
    value: string
    type?: string
  }>(),
  {
    type: 'text',
  },
)

const emit = defineEmits(['update'])

const text = computed({
  get() {
    return props.value || ''
  },
  set(v: string | number | undefined) {
    emit('update', (v === undefined ? '' : v).toString())
  },
})
</script>

<style lang="postcss"></style>
