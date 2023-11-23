<template>
  <Teleport to="#pb-paragraph-actions-options">
    <OptionsForm
      v-if="types.length === 1"
      :key="uuids.join('-')"
      :uuids="uuids"
      :paragraph-type="types[0]"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { onlyUnique } from '../../helpers'
import OptionsForm from './Form/index.vue'

const { selectedParagraphs } = useParagraphsBuilderStore()
const uuids = computed(() => selectedParagraphs.value.map((v) => v.uuid))
const types = computed(() =>
  selectedParagraphs.value
    .map((v) => v.reusableBundle || v.paragraphType)
    .filter(onlyUnique),
)
</script>
