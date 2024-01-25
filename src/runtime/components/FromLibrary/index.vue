<template>
  <BlokkliItem
    v-if="item"
    :key="item.uuid"
    v-bind="item"
    :index="index"
    :data-reusable-bundle="item.bundle"
    :data-reusable-uuid="item.uuid"
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
import type { FieldListItem } from '../../types'

interface LibraryItem {
  block?: FieldListItem
}

const props = defineProps<{
  libraryItem?: LibraryItem
}>()

const { index, options, parentType } = defineBlokkli({
  bundle: 'from_library',
})

// Reusable items inherit the options from this wrapper paragraph.
// They are injected in the defineBlokkli() composable.
provide(INJECT_REUSABLE_OPTIONS, options)
provide(INJECT_IS_IN_REUSABLE, true)

const item = computed(() => {
  const v = props.libraryItem?.block
  if (v && 'uuid' in v) {
    return v
  }
})
</script>

<script lang="ts">
export default {
  name: 'BlokkliFromLibrary',
}
</script>
