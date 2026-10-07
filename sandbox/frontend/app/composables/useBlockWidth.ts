import { computed } from '#imports'
import type { ComputedRef } from 'vue'

type Width = 'content' | 'wide' | 'full'

/**
 * The block's value of the global width option, or null where it has no
 * effect: nested blocks fill their column, and on detail pages (Node/Page)
 * the sidebar layout makes every width the column's. The editor hides the
 * option there too (each block's determineVisibleOptions). Pass what
 * defineBlokkli() returns.
 */
export function useBlockWidth(block: {
  options: ComputedRef<{ width: Width }>
  parentType: ComputedRef<string | undefined>
  provider: ComputedRef<{ bundle: string } | null>
}) {
  return computed<Width | null>(() => {
    return block.parentType.value || block.provider.value?.bundle === 'page'
      ? null
      : block.options.value.width
  })
}
