<template>
  <Teleport to="#bk-blokkli-item-actions-controls">
    <OptionsForm
      v-if="types.length === 1 && !selection.isDragging.value"
      :key="uuids.join('-')"
      :uuids="uuids"
      :item-bundle="types[0]"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'
import { onlyUnique } from '#blokkli/helpers'
import OptionsForm from './Form/index.vue'

defineBlokkliFeature({
  description: 'Renders the options form for one or more blocks.',
  requiredAdapterMethods: ['updateOptions'],
})

const { selection } = useBlokkli()

const uuids = computed(() => selection.blocks.value.map((v) => v.uuid))
const types = computed(() =>
  selection.blocks.value
    .map((v) => v.reusableBundle || v.itemBundle)
    .filter(onlyUnique),
)
</script>

<script lang="ts">
export default {
  name: 'Options',
}
</script>
