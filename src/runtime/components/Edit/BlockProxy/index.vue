<template>
  <div ref="root" class="bk-block-proxy">
    <div class="bk-block-proxy-header">
      <ItemIcon :bundle="bundle" />
      {{ type?.label }}
    </div>
    <div v-if="proxyComponent" class="bk-block-proxy-component">
      <Component :is="proxyComponent" v-bind="itemProps" />
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
import { computed, useBlokkli, onMounted, onBeforeUnmount, ref } from '#imports'
import {
  getDefinition,
  getBlokkliItemProxyComponent,
} from '#blokkli/definitions'

import { ItemIcon } from '#blokkli/components'
import type { FieldConfig } from '#blokkli/types'
import { falsy } from '#blokkli/helpers'

const props = defineProps<{
  uuid: string
  bundle: string
  fieldListType: ValidFieldListTypes
  parentType: BlockBundleWithNested
  itemProps?: any
}>()

const { dom, types, runtimeConfig } = useBlokkli()

const root = ref<HTMLElement | null>(null)

const type = computed(() => types.getBlockBundleDefinition(props.bundle))

const proxyComponent = getBlokkliItemProxyComponent(props.bundle)

const definition = getDefinition(
  props.bundle,
  props.fieldListType,
  props.parentType,
)

const fieldLayout = computed<FieldConfig[][]>(() => {
  if (definition?.editor?.fieldLayout) {
    return definition.editor.fieldLayout.map((row) => {
      return row
        .map((fieldName) => {
          return types.fieldConfig.forName(
            runtimeConfig.itemEntityType,
            props.bundle,
            fieldName,
          )
        })
        .filter(falsy)
    })
  }

  return types.fieldConfig
    .forEntityTypeAndBundle(runtimeConfig.itemEntityType, props.bundle)
    .map((config) => [config])
})

onMounted(() => {
  dom.registerBlock(
    props.uuid,
    root.value,
    props.bundle,
    props.fieldListType,
    props.parentType as BlockBundleWithNested,
  )
})

onBeforeUnmount(() => {
  dom.unregisterBlock(props.uuid)
})
</script>
