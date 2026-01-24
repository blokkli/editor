<template>
  <FormTextarea
    v-if="multiline"
    :id="name"
    v-model="value"
    :label
    :required
    :placeholder
    :description
    :minlength="minLength"
    :maxlength="maxLength"
  />
  <FormText
    v-else
    :id="name"
    v-model="value"
    :label
    :required
    :description
    :placeholder
    :minlength="minLength"
    :maxlength="maxLength"
  />
</template>

<script setup lang="ts">
import { FormText, FormTextarea } from '#blokkli/editor/components'
import type { PluginConfigInputText } from '#blokkli/editor/types/pluginConfig'

defineProps<PluginConfigInputText>()

const value = defineModel<string>()
</script>
