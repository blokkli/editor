<template>
  <BlockPreviewItem
    :items="item"
    :title="label || name"
    :description="description"
    :max-height="500"
    :no-preview="!renderPreview"
  />
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { BlockPreviewItem } from '#blokkli/editor/components'
import { fragmentBlockBundle } from '#blokkli-build/config'

const props = defineProps<{
  name: string
  index: number
  label?: string
  description?: string
}>()

const { definitions } = useBlokkli()

const item = computed(() => ({
  bundle: fragmentBlockBundle,
  uuid: props.index.toString(),
  isVisible: true,
  props: {
    name: props.name,
  },
}))

const definition = computed(() => definitions.getFragmentDefinition(props.name))

const renderPreview = computed(
  () => definition.value?.editor?.noPreview !== true,
)
</script>
