<template>
  <slot :links />
</template>

<script lang="ts">
type BundleWithoutLibrary = Exclude<
  FieldListItemTyped['bundle'],
  typeof fromLibraryBlockBundle
>
</script>

<script setup lang="ts" generic="T extends BundleWithoutLibrary">
import type { fromLibraryBlockBundle } from '#blokkli-build/config'
import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import type { FieldListItem } from '#blokkli/types'
import { falsy } from '#blokkli/helpers'
import { getRuntimeOptions } from '#blokkli/helpers/runtimeHelpers'
import { computed, useBlokkliHelper } from '#imports'
import { BK_HIDDEN_GLOBALLY } from './../../../../../global/constants'
import type { BlokkliTableOfContentsLink } from './../../types'

const props = defineProps<{
  /**
   * Which bundles to include. This will also match reusable blocks of this bundle.
   */
  bundles: T[]

  /**
   * The name of the defineBlokkli option used to toggle if a block should be
   * added to the table of contents.
   *
   * If not provided, all blocks are included.
   */
  optionName?: string

  /**
   * Map a block item to a link.
   */
  mapItem: (
    item: Extract<FieldListItemTyped, { bundle: T }>,
  ) => BlokkliTableOfContentsLink | null

  /**
   * The blocks to search, e.g. the list of a field that the component is
   * placed next to. If not provided, the blocks of the field the component is
   * placed in.
   */
  list?: Array<FieldListItem | null | undefined>
}>()

defineSlots<{
  default(props: { links: BlokkliTableOfContentsLink[] }): any
}>()

const { queryBlocks } = useBlokkliHelper()

// @todo: A passed list is what the page received, not what <BlokkliField>
// renders: while editing, the edit state's changes to the field's top-level
// blocks are missing, and its hidden top-level blocks (e.g. with "Visible
// languages") are included. Take a field name instead, and resolve that
// field's list from the provider the way <BlokkliField> does.
const items = queryBlocks(
  props.bundles,
  () => props.list as FieldListItemTyped[] | undefined,
)

const links = computed<BlokkliTableOfContentsLink[]>(() => {
  return items.value
    .filter((item) => {
      if ('bundle' in item) {
        const options = getRuntimeOptions(item as any)
        if (!options) {
          return null
        }

        if (props.optionName) {
          const shouldShow = (options as any)[props.optionName as any]
          if (!shouldShow) {
            return false
          }
        }

        const hiddenGlobally = (options as any)[BK_HIDDEN_GLOBALLY]
        if (hiddenGlobally) {
          return false
        }

        return true
      }
    })
    .map(props.mapItem)
    .filter(falsy)
})
</script>
