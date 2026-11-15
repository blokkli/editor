import { computed, inject } from '#imports'
import type { ComputedRef, InjectionKey } from 'vue'
import type { CompositionImagePlacement } from '../types'

export type CompositionChildContext = {
  /** The child's key: its id in the composition's markup. */
  key: string
  /** How its image is shown, if the markup says (`:image-style`). */
  placement: CompositionImagePlacement | null
  /** The element it renders as, if the markup says (`as="h2"`). */
  as: string | null
}

export const INJECT_COMPOSITION_CHILD = Symbol(
  'blokkli_composition_child',
) as InjectionKey<ComputedRef<CompositionChildContext>>

/**
 * In a paragraph type's component for compositions: where the composition
 * placed it. The image's placement turns into the site's image style.
 *
 * The component's root is the element the markup placed: the composition's
 * class, its scope and the child's key arrive on it as attributes, so it has a
 * single root.
 */
export function useCompositionChild(): ComputedRef<CompositionChildContext | null> {
  const context = inject(INJECT_COMPOSITION_CHILD, null)
  return computed(() => context?.value ?? null)
}
