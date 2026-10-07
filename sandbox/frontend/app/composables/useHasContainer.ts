import type { ComputedRef } from 'vue'

/**
 * Whether the block brings its own container (container-content or
 * container-wide). Not where it fills the column it's in: a nested block its
 * parent's, a block in another field list (the sidebar, the footer, …) that
 * list's, and a block on a detail page the page's (Node/Page: the sidebar
 * layout is the container).
 *
 * A block decides this from its own context, never from its ancestors'
 * classes: while dragging, the editor renders a copy of the block without
 * them. Pass what defineBlokkli() returns.
 */
export function useHasContainer(block: {
  parentType: ComputedRef<string | undefined>
  fieldListType: ComputedRef<string>
  provider: ComputedRef<{ bundle: string } | null>
}) {
  return computed(
    () =>
      !block.parentType.value &&
      block.fieldListType.value === 'default' &&
      block.provider.value?.bundle !== 'page',
  )
}
