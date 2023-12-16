<template>
  <BlokkliItem
    v-if="item && item.item"
    :key="item.item.id"
    v-bind="item"
    :index="index"
    :data-reusable-bundle="item.item.entityBundle"
    :data-reusable-uuid="item.item.uuid"
    data-blokkli-is-reusable="true"
    :parent-type="parentType"
  />
</template>

<script lang="ts" setup>
import { computed, provide, defineBlokkli } from '#imports'
import {
  INJECT_IS_IN_REUSABLE,
  INJECT_REUSABLE_OPTIONS,
} from '#blokkli/helpers/symbols'
import type { BlokkliFieldList } from '../../types'

interface LibraryItem {
  field?: {
    list?: BlokkliFieldList<any>[]
  }
}

const props = defineProps<{
  libraryItem?: LibraryItem
}>()

const { index, options, parentType } = defineBlokkli({
  bundle: 'from_library',
})

console.log(options)

// Reusable items inherit the options from this wrapper paragraph.
// They are injected in the defineBlokkli() composable.
provide(INJECT_REUSABLE_OPTIONS, options)
provide(INJECT_IS_IN_REUSABLE, true)

const item = computed(() => {
  const v = props.libraryItem?.field?.list?.[0]
  if (v && v.item && 'uuid' in v.item) {
    return v
  }
})
</script>

<script lang="ts">
export default {
  name: 'BlokkliFromLibrary',
}
</script>
