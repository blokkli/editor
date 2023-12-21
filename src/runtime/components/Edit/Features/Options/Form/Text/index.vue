<template>
  <div class="bk-blokkli-item-options-text" :class="'bk-is-type-' + type">
    <input v-model="text" :type="type" :placeholder="label" :style="style" />
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

const style = computed(() => {
  return {
    width: Math.max(text.value.length * 20, 100) + 'px',
  }
})

const text = computed<string>({
  get() {
    return props.value || ''
  },
  set(v: string | number | undefined) {
    emit('update', (v === undefined ? '' : v).toString())
  },
})
</script>

<style lang="postcss"></style>
