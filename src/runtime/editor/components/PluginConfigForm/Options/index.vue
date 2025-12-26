<template>
  <FormSelect
    v-if="variant === 'select'"
    :id
    v-model="value"
    :label
    :description
    :required
    :options
  />
  <FormRadio
    v-else
    :id
    v-model="value"
    :label
    :description
    :required
    :options
  />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { PluginConfigInputOptions } from '#blokkli/types'
import { FormSelect, FormRadio } from '#blokkli/editor/components'

const props = defineProps<PluginConfigInputOptions>()

const value = defineModel<string>()

const id = computed(() => 'plugin-form-item-' + props.name)
</script>
