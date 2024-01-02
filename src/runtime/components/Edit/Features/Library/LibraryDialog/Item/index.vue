<template>
  <div
    class="bk-library-list-item"
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
      <ScaleToFit :width="editWidth">
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

import { getDefinition } from '#blokkli/definitions'
import type { FieldListItem } from '#blokkli/types'
import { ItemIcon, ScaleToFit } from '#blokkli/components'
import {
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
} from '#blokkli/helpers/symbols'

const componentProps = defineProps<{
  uuid: string
  label?: string
  bundle: string
  item: FieldListItem
}>()

const definition = computed(() => getDefinition(componentProps.bundle))

const editWidth = computed(() => definition.value?.editWidth)
const renderPreview = computed(
  () => definition.value?.noLibraryPreview !== true,
)

const backgroundClass = computed(
  () => definition.value?.editBackgroundClass || '',
)

provide(INJECT_IS_IN_REUSABLE, true)
provide(INJECT_IS_EDITING, false)
</script>
