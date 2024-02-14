<template>
  <div class="bk-library-list-item" :class="backgroundClass">
    <div class="bk bk-library-list-item-header">
      <h3>{{ label || name }}</h3>
      <p v-if="description">{{ description }}</p>
    </div>
    <div
      v-if="renderPreview"
      class="bk-library-list-item-inner"
      :class="backgroundClass"
    >
      <ScaleToFit :width="previewWidth">
        <BlokkliItem
          v-bind="item"
          parent-type="nested"
          class="bk-drop-element"
        />
      </ScaleToFit>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide } from '#imports'
import { getFragmentDefinition } from '#blokkli/definitions'
import { ScaleToFit } from '#blokkli/components'
import {
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
  INJECT_PROVIDER_BLOCKS,
} from '#blokkli/helpers/symbols'

const props = defineProps<{
  name: string
  index: number
  label?: string
  description?: string
}>()

const item = computed(() => {
  return {
    bundle: 'blokkli_fragment',
    uuid: props.index.toString(),
    props: {
      name: props.name,
    },
  }
})

const definition = computed(() => getFragmentDefinition(props.name))

const previewWidth = computed(() => definition.value?.editor?.previewWidth)
const renderPreview = computed(
  () => definition.value?.editor?.noPreview !== true,
)

const backgroundClass = computed(
  () => definition.value?.editor?.previewBackgroundClass || '',
)

const blocks = computed(() => [])

provide(INJECT_IS_IN_REUSABLE, true)
provide(INJECT_IS_EDITING, false)
provide(INJECT_FIELD_LIST_BLOCKS, blocks)
provide(INJECT_PROVIDER_BLOCKS, blocks)
</script>
