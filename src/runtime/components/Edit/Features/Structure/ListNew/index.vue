<template>
  <ul class="bk-structure-list">
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
      />
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, ref, nextTick } from '#imports'
import Field from './Field/index.vue'
import type { MutatedField } from '#blokkli/types'

defineProps<{
  fields: MutatedField[]
  entityBundle: string
}>()
</script>
