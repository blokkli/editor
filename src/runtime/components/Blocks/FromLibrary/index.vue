<template>
  <BlokkliItem
    v-if="item"
    :key="item.uuid"
    v-bind="item"
    :index
    :data-reusable-bundle="item.bundle"
    :data-reusable-uuid="item.uuid"
    :data-bk-library-label="libraryItem?.label"
    :data-bk-library-item-uuid="libraryItem?.uuid"
    data-blokkli-is-reusable="true"
    :parent-type
    :is-editing
  />
</template>

<script lang="ts" setup>
import { computed, provide, defineBlokkli } from '#imports'
import {
  INJECT_IS_IN_REUSABLE,
  INJECT_REUSABLE_OPTIONS,
  INJECT_REUSABLE_UUID,
} from '#blokkli/helpers/symbols'
import type { LibraryItemProps } from '#blokkli/types'

export type Props = {
  libraryItem?: LibraryItemProps
}

const props = defineProps<Props>()

const { index, options, parentType, isEditing, uuid } = defineBlokkli({
  bundle: 'from_library',
})

// Reusable items inherit the options from this wrapper paragraph.
// They are injected in the defineBlokkli() composable.
provide(INJECT_REUSABLE_OPTIONS, options)
provide(INJECT_IS_IN_REUSABLE, true)
provide(INJECT_REUSABLE_UUID, uuid)

const item = computed(() => {
  const v = props.libraryItem?.block
  if (v && 'uuid' in v) {
    return v
  }

  return undefined
})
</script>

<script lang="ts">
export default {
  name: 'BlokkliFromLibrary',
}
</script>
