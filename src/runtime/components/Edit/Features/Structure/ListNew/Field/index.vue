<template>
  <div class="bk-structure-field">
    <div v-if="totalFieldsOfType > 1" class="bk-structure-field-label">
      {{ config?.label || field.name }}
    </div>
    <ul>
      <li
        v-for="item in field.list"
        :key="item.uuid"
        class="bk-structure-field-item"
      >
        <Item :uuid="item.uuid" :bundle="item.bundle" />
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import Item from './../Item/index.vue'
import type { FieldListItem, MutatedField } from '#blokkli/types'

const props = defineProps<{
  field: MutatedField
  entityBundle: string
}>()

const { selection, types } = useBlokkli()

const config = computed(() =>
  types.getFieldConfig(
    props.field.entityType,
    props.entityBundle,
    props.field.name,
  ),
)

const totalFieldsOfType = computed(() => {
  return types.fieldConfig.value.filter(
    (v) =>
      v.entityType === props.field.entityType &&
      v.entityBundle === props.entityBundle,
  ).length
})
</script>
