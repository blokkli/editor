<template>
  <FormTextarea
    :label
    :required
    :placeholder
    :description
    v-model="value"
    :id="name"
  />
</template>

<script setup lang="ts">
import type { PluginConfigInputText } from '#blokkli/types'
import { FormTextarea } from '#blokkli/components'

defineProps<PluginConfigInputText>()

const value = defineModel<string>()
</script>
