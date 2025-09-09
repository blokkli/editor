<template>
  <div>
    <label class="bk-form-label" :for="id">
      {{ label }}
    </label>
    <select :id v-model="value" class="bk-form-input">
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import type { PluginConfigInputOptions } from '#blokkli/types'

const props = defineProps<PluginConfigInputOptions>()

const value = defineModel<string>()

const id = computed(() => 'plugin-form-item-' + props.name)
</script>
