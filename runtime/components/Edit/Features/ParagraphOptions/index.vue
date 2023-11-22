<template>
  <Teleport to="#pb-paragraph-actions-options">
    <OptionsForm
      v-if="selectedParagraph?.uuid"
      :key="selectedParagraph.uuid"
      :uuid="selectedParagraph.uuid"
      :paragraph-type="selectedParagraph.paragraphType"
      :reusable-bundle="selectedParagraph.reusableBundle"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import OptionsForm from './Form/index.vue'

const { selectedParagraph } = useParagraphsBuilderStore()
</script>
