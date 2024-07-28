<template>
  <div
    data-element-type="reusable"
    :data-item-bundle="bundle"
    :data-library-item-uuid="uuid"
    :data-label="label"
    :class="backgroundClass"
  >
    <div class="bk bk-library-list-item-header">
      <div class="bk-blokkli-item-label">
        <div class="bk-blokkli-item-label-icon">
          <ItemIcon :bundle="bundle" />
        </div>
        <span>{{ label }}</span>
      </div>
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

import { getDefaultDefinition } from '#blokkli/definitions'
import type { FieldListItem } from '#blokkli/types'
import { ItemIcon, ScaleToFit } from '#blokkli/components'
import {
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_FIELD_LIST_TYPE,
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
  INJECT_PROVIDER_BLOCKS,
} from '#blokkli/helpers/symbols'

const componentProps = defineProps<{
  uuid: string
  label?: string
  bundle: string
  item: FieldListItem
}>()

const definition = computed(() => getDefaultDefinition(componentProps.bundle))

const previewWidth = computed(() => definition.value?.editor?.previewWidth)
const renderPreview = computed(
  () => definition.value?.editor?.noPreview !== true,
)

const backgroundClass = computed(
  () => definition.value?.editor?.previewBackgroundClass || '',
)

const blocks = computed(() => [])
const fieldListType = computed(() => 'default')

provide(INJECT_IS_IN_REUSABLE, true)
provide(INJECT_IS_EDITING, false)
provide(INJECT_FIELD_LIST_BLOCKS, blocks)
provide(INJECT_PROVIDER_BLOCKS, blocks)
provide(INJECT_FIELD_LIST_TYPE, fieldListType)
</script>
