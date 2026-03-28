<template>
  <div ref="root" class="bk-block-proxy">
    <div class="bk-block-proxy-header">
      <ItemIcon :bundle="bundle" />
      {{ type?.label }}
    </div>
    <div v-if="proxyComponent" class="bk-block-proxy-component">
      <Component :is="proxyComponent" v-bind="proxyComponentProps" />
    </div>
    <div v-if="fieldLayout.length" class="bk-block-proxy-fields">
      <div
        v-for="(row, i) in fieldLayout"
        :key="i"
        class="bk-block-proxy-fields-row"
        :style="{
          gridTemplateColumns: `repeat(${row.length}, 1fr)`,
        }"
      >
        <div
          v-for="field in row"
          :key="field.name"
          class="bk-block-proxy-fields-row-field"
        >
          <span>{{ field.label }}</span>
          <BlokkliField proxy-mode :name="field.name" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  BlockBundleWithNested,
  ValidFieldListTypes,
} from '#blokkli-build/generated-types'
import { computed, useBlokkli } from '#imports'
import { getBlokkliItemProxyComponent } from '#blokkli/editor/helpers/edit-components'
import { ItemIcon } from '#blokkli/editor/components'
import { falsy } from '#blokkli/helpers'
import { fromLibraryBlockBundle, itemEntityType } from '#blokkli-build/config'
import { useBlockRegistration } from '#blokkli/editor/composables'
import type { FieldConfig } from '#blokkli/editor/types/definitions'
import type { LibraryItemProps } from '#blokkli/editor/features/library/types'

const props = defineProps<{
  uuid: string
  bundle: string
  fieldListType: ValidFieldListTypes
  parentType: BlockBundleWithNested
  itemProps?: any
}>()

// Props of the library item, if this is a 'from_library' block.
const libraryItemProps = computed<LibraryItemProps | null>(() => {
  if (props.bundle === fromLibraryBlockBundle) {
    const v = props.itemProps?.libraryItem
    return v as LibraryItemProps
  }

  return null
})

const proxyComponentProps = computed(() => {
  if (props.bundle === fromLibraryBlockBundle) {
    // Pass the props of the reusable block to the proxy component.
    return libraryItemProps.value?.block?.props
  }

  return props.itemProps
})

const proxyBundle = computed(
  () => libraryItemProps.value?.block?.bundle || props.bundle,
)

const { types, definitions, dom } = useBlokkli()

const type = computed(() => types.getBlockBundleDefinition(proxyBundle.value))

const proxyComponent = getBlokkliItemProxyComponent(proxyBundle.value)

const definition = definitions.getBlockDefinition(
  proxyBundle.value,
  props.fieldListType,
  props.parentType,
)

const fieldLayout = computed<FieldConfig[][]>(() => {
  // Currently structure view does not work for reusable blocks with
  // nested blocks. As a workaround no fields are displayed. Since the fields
  // Are not editable anyway this is not that big of a problem. However, the
  // proxy block will just display the name of the block with no context.
  // @TOOD: Figure out how to render a non-editable structure view of reusable
  // blocks.
  if (libraryItemProps.value) {
    return []
  }
  if (definition?.editor?.fieldLayout) {
    return definition.editor.fieldLayout.map((row) => {
      return row
        .map((fieldName) => {
          return types.fieldConfig.forName(
            itemEntityType,
            proxyBundle.value,
            fieldName,
          )
        })
        .filter(falsy)
    })
  }

  return types.fieldConfig
    .forEntityTypeAndBundle(itemEntityType, proxyBundle.value)
    .map((config) => [config])
})

useBlockRegistration(dom, props.uuid)
</script>

<style lang="postcss">
.bk-block-proxy {
  @apply text-mono-900 flex-1;
  @apply border border-mono-400 p-15 rounded bg-white shadow-lg;
}

.bk-block-proxy-header {
  @apply flex items-center gap-[7px] text-sm font-semibold text-mono-700;
  .bk-blokkli-item-icon {
    @apply size-25 border border-mono-300 rounded p-[3px] bg-mono-100 text-mono-700;
  }
}

.bk-block-proxy-fields {
  @apply grid gap-15 mt-15;
}

.bk-block-proxy-fields-row {
  @apply grid gap-15;
}

.bk-block-proxy-fields-row-field {
  @apply border border-mono-300 p-15 rounded bg-mono-50;

  > span {
    @apply text-xs uppercase inline-block mb-15 text-mono-400;
    @apply font-semibold;
  }
}

.bk-block-proxy-component {
  @apply my-15 line-clamp-3 last:mb-0;
}
</style>
