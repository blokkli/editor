<template>
  <div
    class="pb-paragraph-options-radios"
    :class="{ 'pb-is-color': displayAs === 'colors' }"
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
        <span>{{ option.value }}</span>
      </div>
    </label>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  name: string
  displayAs?: 'radios' | 'colors'
  options: Record<string, string>
  value: string
}>()

defineEmits(['update'])

function getInputWrapperAttributes(value: string) {
  if (props.displayAs === 'colors') {
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
