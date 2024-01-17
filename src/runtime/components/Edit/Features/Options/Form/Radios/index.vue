<template>
  <div
    class="bk-blokkli-item-options-radios"
    :class="{
      'bk-is-color': displayAs === 'colors',
      'bk-is-grid': displayAs === 'grid',
      'bk-is-icons': displayAs === 'icons',
    }"
  >
    <label v-for="option in mappedOptions" :key="option.key">
      <div v-bind="getInputWrapperAttributes(option.value)">
        <input
          :id="option.key"
          type="radio"
          :name="name"
          :value="option.key"
          :checked="value === option.key"
          @change="$emit('update', option.key)"
        />
        <div
          v-if="displayAs === 'icons'"
          class="bk-blokkli-item-options-radios-icon"
        >
          <Icon :name="option.value as any" />
        </div>
        <span v-else-if="typeof option.value === 'string'" class="bk-is-text">
          {{ option.value }}
        </span>
        <div v-else class="bk-blokkli-item-options-radios-flex">
          <div v-for="(v, i) in option.value" :key="i" :style="{ flex: v }" />
        </div>
      </div>
    </label>
  </div>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { Icon } from '#blokkli/components'

const props = defineProps<{
  name: string
  displayAs?: 'radios' | 'colors' | 'grid' | 'icons'
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
