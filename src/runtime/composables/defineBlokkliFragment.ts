import {
  INJECT_EDIT_CONTEXT,
  INJECT_FRAGMENT_CONTEXT,
} from '../helpers/symbols'
import { inject, computed } from '#imports'
import type {
  BlockDefinitionOptionsInput,
  DefineBlokkliContext,
  FragmentDefinitionInput,
  ItemEditContext,
} from '#blokkli/types'
import type { GlobalOptionsKey } from '#blokkli-build/generated-types'

export function defineBlokkliFragment<
  T extends BlockDefinitionOptionsInput = BlockDefinitionOptionsInput,
  G extends GlobalOptionsKey[] | undefined = undefined,
>(_config: FragmentDefinitionInput<T, G>): DefineBlokkliContext<T, G> {
  // Provided by the <BlokkliFragment> component.
  // All context logic is handled by its defineBlokkli.
  const ctx = inject<DefineBlokkliContext<T, G> | null>(
    INJECT_FRAGMENT_CONTEXT,
    null,
  )

  // Can be the case if the fragment component is rendered standalone.
  if (!ctx) {
    return {
      uuid: '',
      index: computed(() => 0),
      isEditing: false,
      parentType: computed(() => undefined),
      fieldListType: computed(() => 'default'),
      siblings: computed(() => []),
      rootBlocks: computed(() => []),
      options: computed(() => ({}) as any),
      provider: computed(() => null),
    }
  }

  const editContext = inject<ItemEditContext | null>(INJECT_EDIT_CONTEXT, null)

  if (editContext?.dom && editContext.useBlockRegistration) {
    editContext.useBlockRegistration(editContext.dom, ctx.uuid)
  }

  return ctx as DefineBlokkliContext<T, G>
}
