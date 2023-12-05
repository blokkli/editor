<template>
  <label class="bk-paragraph-options-checkbox">
    <input type="checkbox" v-model="checked" class="peer" />
    <div></div>
    <span>{{ label }}</span>
  </label>
</template>

<script lang="ts" setup>
const props = defineProps<{
  label: string
  value: string
}>()

const emit = defineEmits(['update'])

const checked = computed({
  get() {
    return props.value === '1'
  },
  set(v: any) {
    emit('update', v ? '1' : '')
  },
})
</script>

<style lang="postcss"></style>
