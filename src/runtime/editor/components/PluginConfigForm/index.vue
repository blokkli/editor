<template>
  <ol class="bk-plugin-config-form">
    <slot name="before" />
    <li
      v-for="item in renderedConfig"
      :key="item.name"
      :class="'bk-is-type-' + item.type"
    >
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
      <slot name="after" />
    </li>
  </ol>
</template>

<script setup lang="ts">
import FormCheckbox from './Checkbox/index.vue'
import FormText from './Text/index.vue'
import FormOptions from './Options/index.vue'
import { computed } from '#imports'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'

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

<style lang="postcss">
.bk .bk-plugin-config-form {
  @apply flex flex-wrap gap-10 items-end;
  > li {
    @apply flex-1 shrink;

    &.bk-is-type-options,
    &.bk-is-type-text {
      @apply min-w-[200px];
    }
    &.bk-is-type-checkbox {
      @apply flex-none;
      min-height: 46px;
      @apply flex items-center;
    }
  }
}
</style>
