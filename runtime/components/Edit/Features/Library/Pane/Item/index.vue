<template>
  <div
    class="bk-library-list-item"
    data-element-type="reusable"
    :data-paragraph-bundle="bundle"
    :data-library-item-uuid="uuid"
    :data-label="label"
    :class="backgroundClass"
  >
    <div class="bk bk-library-list-item-header">
      <div class="bk-paragraph-label">
        <div class="bk-paragraph-label-icon">
          <ParagraphIcon :bundle="bundle" />
        </div>
        <span>{{ label }}</span>
      </div>
    </div>
    <div
      v-if="renderPreview"
      class="bk-library-list-item-inner"
      :class="backgroundClass"
    >
      <ScaleToFit :width="paragraphWidth">
        <BlokkliItem
          :item="item"
          :paragraph="paragraph"
          parent-paragraph-bundle="nested"
        />
      </ScaleToFit>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getDefinition } from '#blokkli/definitions'
import { BlokkliLibraryItem } from '#blokkli/types'
import { ParagraphIcon, ScaleToFit } from '#blokkli/components'
import {
  INJECT_IS_EDITING,
  INJECT_IS_IN_REUSABLE,
} from '#blokkli/helpers/symbols'

const props = defineProps<BlokkliLibraryItem>()

const definition = computed(() => getDefinition(props.bundle))

const paragraphWidth = computed(() => definition.value?.editWidth)
const renderPreview = computed(
  () => definition.value?.noLibraryPreview !== true,
)

const backgroundClass = computed(
  () => definition.value?.editBackgroundClass || '',
)

provide(INJECT_IS_IN_REUSABLE, true)
provide(INJECT_IS_EDITING, false)
</script>
