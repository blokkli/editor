<template>
  <div class="bk-vars bk-block-preview-item" :class="backgroundClass">
    <div class="bk bk-block-preview-item-header">
      <div v-if="bundle" class="bk-blokkli-item-label">
        <div class="bk-blokkli-item-label-icon">
          <ItemIcon :bundle="bundle" />
        </div>
        <span>{{ bundleLabel }}: {{ title }}</span>
      </div>
      <template v-else>
        <h3>{{ title }}</h3>
        <p v-if="description">{{ description }}</p>
      </template>
    </div>
    <div
      v-if="renderPreview"
      class="bk-block-preview-item-inner"
      :class="backgroundClass"
    >
      <div
        v-for="item in normalizedItems"
        :key="item.uuid"
        class="bk-block-preview-item-block"
      >
        <ScaleToFit :width="previewWidth" :max-height="maxHeight">
          <BlokkliItem v-bind="item" parent-type="nested" />
        </ScaleToFit>
      </div>
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

const props = withDefaults(
  defineProps<{
    items?: FieldListItem[] | FieldListItem
    title: string
    description?: string
    bundle?: string
    maxHeight?: number
    noPreview?: boolean
  }>(),
  {
    items: () => [],
    description: undefined,
    bundle: undefined,
    maxHeight: 400,
    noPreview: false,
  },
)

const { types, definitions } = useBlokkli()

const normalizedItems = computed(() => {
  if (!props.items) {
    return []
  }
  return Array.isArray(props.items) ? props.items : [props.items]
})

const bundleLabel = computed(() =>
  props.bundle
    ? types.getBlockBundleDefinition(props.bundle)?.label || props.bundle
    : '',
)

// Get the first item's bundle to determine preview settings
const firstBundle = computed(
  () => props.bundle || normalizedItems.value[0]?.bundle,
)

const definition = computed(() =>
  firstBundle.value
    ? definitions.getDefaultDefinition(firstBundle.value)
    : null,
)

const previewWidth = computed(
  () => definition.value?.editor?.previewWidth || 400,
)

const renderPreview = computed(
  () => !props.noPreview && definition.value?.editor?.noPreview !== true,
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

<style lang="postcss">
.bk-vars.bk-block-preview-item {
  @apply h-full flex flex-col;

  .bk-block-preview-item-header {
    @apply p-15 bg-mono-100;

    h3 {
      @apply font-semibold;
    }
  }

  .bk-block-preview-item-inner {
    @apply p-20 overflow-hidden relative flex flex-col gap-5 items-center justify-center h-full;

    > .bk-scale-to-fit {
      @apply w-full;
    }

    &:after {
      content: '';
      @apply absolute bottom-0 left-0 w-full h-20;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0), white 40%);
    }
  }

  .bk-block-preview-item-block {
    @apply rounded overflow-hidden w-full;
  }
}
</style>
