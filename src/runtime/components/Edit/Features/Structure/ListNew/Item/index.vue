<template>
  <div class="bk-structure-item" :class="{ 'bk-is-selected': isSelected }">
    <button class="bk-structure-item-label" @click.prevent="onClick">
      <ItemIcon :bundle="bundle" :class="{ 'bk-is-selected': isSelected }" />
      {{ type?.label || bundle }}
    </button>
    <List
      v-if="fields.length"
      :fields="fields"
      :entity-bundle="bundle"
      :level="level + 1"
    />
  </div>
</template>

<script setup lang="ts">
import { useBlokkli, computed } from '#imports'
import List from './../../ListNew/index.vue'
import { ItemIcon } from '#blokkli/components'

const props = withDefaults(
  defineProps<{
    uuid: string
    bundle: string
    level?: number
  }>(),
  {
    level: 0,
  },
)

const { state, runtimeConfig, types, selection, eventBus } = useBlokkli()

const isSelected = computed(() => selection.uuids.value.includes(props.uuid))

const type = computed(() => types.getBlockBundleDefinition(props.bundle))

const fields = computed(() => {
  return state.mutatedFields.value.filter(
    (v) =>
      v.entityUuid === props.uuid &&
      v.entityType === runtimeConfig.itemEntityType,
  )
})

function onClick() {
  eventBus.emit('select', props.uuid)
}
</script>
