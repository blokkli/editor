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
        <Item :uuid="item.uuid" :bundle="item.bundle" :level="level" />
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import Item from './../Item/index.vue'
import type { MutatedField } from '#blokkli/types'

const props = withDefaults(
  defineProps<{
    field: MutatedField
    entityBundle: string
    level?: number
  }>(),
  {
    level: 0,
  },
)

const { types } = useBlokkli()

const config = computed(() =>
  types.getFieldConfig(
    props.field.entityType,
    props.entityBundle,
    props.field.name,
  ),
)

const totalFieldsOfType = computed(
  () =>
    types.fieldConfig.forEntityTypeAndBundle(
      props.field.entityType,
      props.entityBundle,
    ).length,
)
</script>
