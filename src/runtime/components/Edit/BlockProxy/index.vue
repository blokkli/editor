<template>
  <div class="bk-block-proxy">
    <div class="bk-block-proxy-header">
      <ItemIcon :bundle="bundle" />
      {{ definition?.label }}
    </div>
    <div>
      <BlokkliField
        v-for="field in fields"
        :proxy-mode="true"
        :name="field.name"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  BlockBundleWithNested,
  ValidFieldListTypes,
} from '#blokkli/generated-types'
import {
  computed,
  useBlokkli,
  getCurrentInstance,
  onMounted,
  onBeforeUnmount,
} from '#imports'

import { ItemIcon } from '#blokkli/components'

const props = defineProps<{
  uuid: string
  bundle: string
  fieldListType: ValidFieldListTypes
  parentType: string
}>()

const { dom, types, runtimeConfig } = useBlokkli()

const instance = getCurrentInstance()

const definition = computed(() => types.getBlockBundleDefinition(props.bundle))

const fields = computed(() =>
  types.fieldConfig.forEntityTypeAndBundle(
    runtimeConfig.itemEntityType,
    props.bundle,
  ),
)

onMounted(() => {
  dom.registerBlock(
    props.uuid,
    instance,
    props.bundle,
    props.fieldListType,
    props.parentType as BlockBundleWithNested,
  )
})

onBeforeUnmount(() => {
  dom.unregisterBlock(props.uuid)
})
</script>
