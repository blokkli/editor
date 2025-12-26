<template>
  <div
    data-element-type="reusable"
    :data-item-bundle="bundle"
    :data-library-item-uuid="uuid"
    :data-label="label"
    :class="backgroundClass"
    class="bk-library-list-item"
  >
    <div class="bk bk-library-list-item-header">
      <div class="bk-blokkli-item-label">
        <div class="bk-blokkli-item-label-icon">
          <ItemIcon :bundle="bundle" />
        </div>
        <span>{{ bundleLabel }}: {{ label }}</span>
      </div>
    </div>
    <div
      v-if="renderPreview"
      class="bk-library-list-item-inner"
      :class="backgroundClass"
    >
      <ScaleToFit :width="previewWidth" :max-height="400">
        <BlokkliItem v-bind="item" parent-type="nested" />
      </ScaleToFit>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, useBlokkli } from '#imports'
import type { FieldListItem } from '#blokkli/types'
import type {
  FieldListItemTyped,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import { ItemIcon, ScaleToFit } from '#blokkli/editor/components'
import {
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_FIELD_LIST_TYPE,
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
  INJECT_PROVIDER_BLOCKS,
} from '#blokkli/helpers/injections'

const props = defineProps<{
  uuid: string
  label?: string
  bundle: string
  item: FieldListItem
}>()

const { types, definitions } = useBlokkli()

const bundleLabel = computed(
  () => types.getBlockBundleDefinition(props.bundle)?.label || props.bundle,
)

const definition = computed(() =>
  definitions.getDefaultDefinition(props.bundle),
)

const previewWidth = computed(() => definition.value?.editor?.previewWidth)
const renderPreview = computed(
  () => definition.value?.editor?.noPreview !== true,
)

const backgroundClass = computed(
  () => definition.value?.editor?.previewBackgroundClass || '',
)

const blocks = computed(() => [] as FieldListItemTyped[])
const fieldListType = computed(() => 'default' as ValidFieldListTypes)

provide(INJECT_IS_IN_REUSABLE, true)
provide(INJECT_IS_EDITING, false)
provide(INJECT_FIELD_LIST_BLOCKS, blocks)
provide(INJECT_PROVIDER_BLOCKS, blocks)
provide(INJECT_FIELD_LIST_TYPE, fieldListType)
</script>
