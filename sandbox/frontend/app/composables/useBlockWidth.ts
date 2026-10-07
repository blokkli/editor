import type { ComputedRef } from 'vue'

type Width = 'content' | 'wide' | 'full'

/**
 * The block's width option, or null where it has no effect: where the block
 * has no container of its own (useHasContainer). The editor hides the option
 * there too (each block's determineVisibleOptions). Most blocks use the global
 * option; charts and embeds have their own, without "Full". Pass what
 * defineBlokkli() returns.
 */
export function useBlockWidth(block: {
  options: ComputedRef<{ width: Width }>
  parentType: ComputedRef<string | undefined>
  fieldListType: ComputedRef<string>
  provider: ComputedRef<{ bundle: string } | null>
}) {
  const hasContainer = useHasContainer(block)
  return computed<Width | null>(() =>
    hasContainer.value ? block.options.value.width : null,
  )
}
