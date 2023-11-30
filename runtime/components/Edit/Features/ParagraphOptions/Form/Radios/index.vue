<template>
  <div
    class="pb-paragraph-options-radios"
    :class="{
      'pb-is-color': displayAs === 'colors',
      'pb-is-grid': displayAs === 'grid',
    }"
  >
    <label v-for="option in mappedOptions">
      <div v-bind="getInputWrapperAttributes(option.value)">
        <input
          type="radio"
          :id="option.key"
          :name="name"
          :value="option.key"
          :checked="value === option.key"
          @change="$emit('update', option.key)"
        />
        <span v-if="typeof option.value === 'string'" class="pb-is-text">
          {{ option.value }}
        </span>
        <div v-else class="pb-paragraph-options-radios-flex">
          <div v-for="v in option.value" :style="{ flex: v }" />
        </div>
      </div>
    </label>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  name: string
  displayAs?: 'radios' | 'colors' | 'grid'
  options: Record<string, string | number[]>
  value: string
}>()

defineEmits(['update'])

function getInputWrapperAttributes(value: string | number[]) {
  if (props.displayAs === 'colors' && typeof value === 'string') {
    if (value.indexOf('#') === 0) {
      return {
        style: 'background-color: ' + value,
      }
    }
    return {
      class: value,
    }
  }
  return {}
}

const mappedOptions = computed(() => {
  return Object.entries(props.options).map(([key, value]) => {
    return { key, value }
  })
})
</script>
