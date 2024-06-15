<template>
  <ul v-if="fields.length" class="bk-structure-list" :data-level="level">
    <li
      v-for="field in fields"
      :key="field.entityType + field.entityBundle + field.name + entityUuid"
      :data-bundle="entityBundle"
      :data-name="field.name"
    >
      <Field
        :name="field.name"
        :cardinality="field.cardinality"
        :allowed-bundles="field.allowedBundles"
        :entity-uuid="entityUuid"
        :entity-type="entityType"
        :entity-bundle="entityBundle"
        :show-label="fields.length > 1"
        :level="level"
        :visible-field-keys="visibleFieldKeys"
        :is-selected-from-parent="isSelectedFromParent"
      />
    </li>
  </ul>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import Field from './Field/index.vue'

const props = withDefaults(
  defineProps<{
    entityUuid: string
    entityType: string
    entityBundle: string
    visibleFieldKeys: Record<string, boolean>
    level?: number
    isSelectedFromParent?: boolean
  }>(),
  {
    level: 0,
  },
)

const { types } = useBlokkli()

const fields = computed(() => {
  return types.fieldConfig.forEntityTypeAndBundle(
    props.entityType,
    props.entityBundle,
  )
})

defineOptions({
  name: 'StructureList',
})
</script>
