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
import type { PluginConfigInputText } from '#blokkli/types'
import { FormText, FormTextarea } from '#blokkli/editor/components'

defineProps<PluginConfigInputText>()

const value = defineModel<string>()
</script>
