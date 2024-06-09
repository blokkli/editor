<template>
  <ul class="bk-structure-list" :data-level="level">
    <li
      v-for="field in fields"
      :key="field.entityUuid + field.name"
      :data-bundle="entityBundle"
      :data-name="field.name"
    >
      <Field
        :field="field"
        :entity-bundle="entityBundle"
        :show-label="fields.length > 1"
        :level="level"
      />
    </li>
  </ul>
</template>

<script lang="ts" setup>
import Field from './Field/index.vue'
import type { MutatedField } from '#blokkli/types'

withDefaults(
  defineProps<{
    fields: MutatedField[]
    entityBundle: string
    level?: number
  }>(),
  {
    level: 0,
  },
)
</script>
