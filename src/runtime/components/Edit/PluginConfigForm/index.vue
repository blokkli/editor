<template>
  <ol class="bk-plugin-config-form">
    <li v-for="item in config" class="bk-form-item">
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

const props = defineProps<{
  config: PluginConfigInput[]
}>()

const value = defineModel<Record<string, any>>({
  default: () => {
    return {}
  },
})

props.config.forEach((config) => {
  value.value[config.name] = config.defaultValue
})
</script>
