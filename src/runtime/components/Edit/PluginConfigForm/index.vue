<template>
  <ol>
    <li v-for="item in renderedConfig" :key="item.name" class="bk-form-item">
      <FormCheckbox
        v-if="item.type === 'checkbox'"
        v-bind="item"
        v-model="value[item.name]"
      />
      <FormText
        v-else-if="item.type === 'text'"
        v-bind="item"
        v-model="value[item.name]"
      />
      <FormOptions
        v-else-if="item.type === 'options'"
        v-bind="item"
        v-model="value[item.name]"
      />
    </li>
  </ol>
</template>

<script setup lang="ts">
import type { PluginConfigInput } from '#blokkli/types'
import FormCheckbox from './Checkbox/index.vue'
import FormText from './Text/index.vue'
import FormOptions from './Options/index.vue'
import { computed } from '#imports'

const props = defineProps<{
  config: PluginConfigInput[]
}>()

const renderedConfig = computed(() =>
  props.config.filter((v) => v.type !== 'seed'),
)

const value = defineModel<Record<string, any>>({
  default: () => {
    return {}
  },
})

function updateSeed() {
  props.config.forEach((config) => {
    if (config.type === 'seed') {
      value.value[config.name] = Math.round(
        Date.now() * Math.random(),
      ).toString()
    }
  })
}

props.config.forEach((config) => {
  if ('defaultValue' in config) {
    value.value[config.name] = config.defaultValue
  }
})

updateSeed()

defineExpose({
  updateSeed,
})
</script>
