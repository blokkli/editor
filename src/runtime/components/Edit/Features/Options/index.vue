<template>
  <Teleport to="#bk-blokkli-item-actions-options">
    <OptionsForm
      v-if="types.length === 1 && !selection.isDragging.value"
      :key="uuids.join('-')"
      :uuids="uuids"
      :item-bundle="types[0]"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'

import { onlyUnique } from '#blokkli/helpers'
import OptionsForm from './Form/index.vue'

const { selection } = useBlokkli()

const uuids = computed(() => selection.blocks.value.map((v) => v.uuid))
const types = computed(() =>
  selection.blocks.value
    .map((v) => v.reusableBundle || v.itemBundle)
    .filter(onlyUnique),
)
</script>