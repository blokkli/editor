<template>
  <div ref="root" class="bk-block-proxy" v-bind="rootProps">
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
} from '#blokkli/generated-types'
import { computed, useBlokkli, ref } from '#imports'
import {
  getDefinition,
  getBlokkliItemProxyComponent,
} from '#blokkli/definitions'

import { ItemIcon } from '#blokkli/components'
import type { FieldConfig, LibraryItemProps } from '#blokkli/types'
import { buildAttributesForLibraryItem, falsy } from '#blokkli/helpers'

const props = defineProps<{
  uuid: string
  bundle: string
  fieldListType: ValidFieldListTypes
  parentType: BlockBundleWithNested
  itemProps?: any
}>()

// Props of the library item, if this is a 'from_library' block.
const libraryItemProps = computed<LibraryItemProps | null>(() => {
  if (props.bundle === 'from_library') {
    const v = props.itemProps?.libraryItem
    return v as LibraryItemProps
  }

  return null
})

const proxyComponentProps = computed(() => {
  if (props.bundle === 'from_library') {
    // Pass the props of the reusable block to the proxy component.
    return libraryItemProps.value?.block?.props
  }

  return props.itemProps
})

const rootProps = computed(() => {
  if (libraryItemProps.value) {
    return buildAttributesForLibraryItem(libraryItemProps.value)
  }

  return {}
})

const proxyBundle = computed(
  () => libraryItemProps.value?.block?.bundle || props.bundle,
)

const { types, runtimeConfig } = useBlokkli()

const root = ref<HTMLElement | null>(null)

const type = computed(() => types.getBlockBundleDefinition(proxyBundle.value))

const proxyComponent = getBlokkliItemProxyComponent(proxyBundle.value)

const definition = getDefinition(
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
            runtimeConfig.itemEntityType,
            proxyBundle.value,
            fieldName,
          )
        })
        .filter(falsy)
    })
  }

  return types.fieldConfig
    .forEntityTypeAndBundle(runtimeConfig.itemEntityType, proxyBundle.value)
    .map((config) => [config])
})
</script>
