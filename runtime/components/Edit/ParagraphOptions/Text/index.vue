<template>
  <div class="pb-paragraph-options-text">
    <input type="text" :placeholder="label" v-model.lazy="text" />
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  label: string
  value: string
}>()

const emit = defineEmits(['update'])

const text = computed({
  get() {
    return props.value || ''
  },
  set(v: any) {
    emit('update', v)
  },
})
</script>

<style lang="postcss"></style>
