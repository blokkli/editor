import { computed, ref, readonly, type Ref, type ComputedRef } from '#imports'
import type {
  BlockDefinition,
  FragmentDefinition,
  Definitions,
  ProviderDefinition,
} from '#blokkli-build/definitions'
import definitions from '#blokkli-build/definitions'
import type {
  ValidFieldListTypes,
  BlockBundleWithNested,
  ValidProviderTypes,
} from '#blokkli-build/generated-types'
import type { DeepReadonly } from 'vue'
import type { BlockDefinitionOptionsInput } from '../../types/definitions'
import { OPTIONS } from '#blokkli-build/runtime-options'
import type { RuntimeBlockOptionArray } from '../../../global/types/blockOptions'
import type { RenderedFieldListItem } from '../types/field'

export type DefinitionProvider = {
  /**
   * Get the block definition for a specific context.
   *
   * Checks for context-specific definitions in this order:
   * 1. Field list type specific (e.g., bundle__field:canvas)
   * 2. Parent bundle specific (e.g., bundle__parent:accordion)
   * 3. Default bundle definition
   *
   * @param bundleOrBlock - The block bundle name, or a rendered field list item
   * @param fieldListType - The field list type context
   * @param parentBundle - Optional parent block bundle for nested blocks
   * @returns The block definition, or undefined if not found
   */
  getBlockDefinition: (
    bundleOrBlock: string | RenderedFieldListItem,
    fieldListType: ValidFieldListTypes | null,
    parentBundle: BlockBundleWithNested | null,
  ) => BlockDefinition | undefined

  /**
   * Get the default block definition for a bundle.
   *
   * Returns the base definition without considering context (field list type or parent).
   *
   * @param bundle - The block bundle name
   * @returns The default block definition, or undefined if not found
   */
  getDefaultDefinition: (bundle: string) => BlockDefinition | undefined

  /**
   * Get a fragment definition by name.
   *
   * @param name - The fragment name
   * @returns The fragment definition, or undefined if not found
   */
  getFragmentDefinition: (name: string) => FragmentDefinition | undefined

  /**
   * Get a provider definition for an entity type and bundle.
   *
   * @param entityType - The entity type (e.g., 'node', 'block_content')
   * @param entityBundle - The entity bundle (e.g., 'article', 'page')
   * @returns The provider definition, or undefined if not found
   */
  getProviderDefinition: (
    entityType: string,
    entityBundle: string,
  ) => ProviderDefinition | undefined

  /**
   * Get the icon name for a block bundle.
   *
   * @param bundle - The block bundle name
   * @returns The icon name, or undefined if no icon is defined
   */
  getBlockIcon: (bundle: string) => string | undefined

  /**
   * Get the image of a block.
   *
   * @param bundle - The block bundle name
   * @returns The url of the image.
   */
  getBlockImage: (bundle: string) => string | undefined

  /**
   * List of all registered fragment definitions.
   *
   * Updates automatically via HMR during development.
   */
  fragmentDefinitions: ComputedRef<FragmentDefinition[]>

  /**
   * List of all registered block definitions.
   *
   * Updates automatically via HMR during development.
   */
  blockDefinitions: ComputedRef<BlockDefinition[]>

  /**
   * Global options that apply to all blocks.
   */
  globalOptions: DeepReadonly<Ref<BlockDefinitionOptionsInput>>

  /**
   * Runtime option values for all blocks.
   *
   * Maps block UUIDs to their option values. Structure:
   * - First level: block UUID
   * - Second level: option key → option value array
   *
   * Updates automatically via HMR during development.
   */
  runtimeOptions: DeepReadonly<
    Ref<Record<string, Record<string, RuntimeBlockOptionArray>>>
  >

  /**
   * Render key that changes when definitions are updated.
   *
   * Use as a component key to force remounting when definitions change.
   * Automatically increments via HMR during development.
   */
  renderKey: DeepReadonly<Ref<string>>

  /**
   * Block bundles that can be added automatically without showing the form.
   */
  bundlesWithAutoAdd: ComputedRef<string[]>
}

export default function (providerType: ValidProviderTypes): DefinitionProvider {
  const blocks = ref<BlockDefinition[]>(definitions.blocks)
  const fragments = ref<FragmentDefinition[]>(definitions.fragments)
  const providers = ref<ProviderDefinition[]>(definitions.providers)
  const renderKey = ref(definitions.renderKey)

  const blockIcons = ref<Record<string, string>>(definitions.icons)
  const blockImages = ref<Record<string, string>>(definitions.images)
  const allGlobalOptions = ref<BlockDefinitionOptionsInput>(
    definitions.globalOptions,
  )
  const runtimeOptions =
    ref<Record<string, Record<string, RuntimeBlockOptionArray>>>(OPTIONS)

  if (import.meta.hot) {
    import.meta.hot.accept('#blokkli-build/definitions', (mod) => {
      const newDefinitions = mod as any as { default: Definitions } | undefined
      renderKey.value = newDefinitions?.default.renderKey || ''
      blocks.value = newDefinitions?.default?.blocks || []
      fragments.value = newDefinitions?.default?.fragments || []
      providers.value = newDefinitions?.default?.providers || []
      blockIcons.value = newDefinitions?.default?.icons || {}
      blockImages.value = newDefinitions?.default?.images || {}
      allGlobalOptions.value = newDefinitions?.default?.globalOptions || {}
    })
    import.meta.hot.accept('#blokkli-build/runtime-options', (mod) => {
      if (mod?.OPTIONS) {
        runtimeOptions.value = mod.OPTIONS
      }
    })
  }

  const blocksByKey = computed(() =>
    blocks.value.reduce<Record<string, BlockDefinition>>((acc, definition) => {
      const bundle = definition.bundle
      const renderForValue = definition.renderFor || []
      const renderForList = Array.isArray(renderForValue)
        ? renderForValue
        : [renderForValue]

      if (renderForList.length) {
        renderForList.forEach((renderFor) => {
          if ('parentBundle' in renderFor) {
            acc[bundle + '__' + 'parent:' + renderFor.parentBundle] = definition
          } else if ('fieldList' in renderFor) {
            acc[bundle + '__' + 'field:' + renderFor.fieldList] = definition
          } else if ('fieldListType' in renderFor) {
            acc[bundle + '__' + 'field:' + renderFor.fieldListType] = definition
          } else if (renderFor.providerType) {
            acc[bundle + '__' + 'provider:' + renderFor.providerType] =
              definition
          }
        })
      } else {
        acc[bundle] = definition
      }
      return acc
    }, {}),
  )

  const fragmentsByName = computed(() =>
    fragments.value.reduce<Record<string, FragmentDefinition>>(
      (acc, definition) => {
        acc[definition.name] = definition
        return acc
      },
      {},
    ),
  )

  const providersByName = computed(() =>
    providers.value.reduce<Record<string, ProviderDefinition>>(
      (acc, definition) => {
        const key = `${definition.entityType}:${definition.bundle}`
        acc[key] = definition
        return acc
      },
      {},
    ),
  )

  function getBlockDefinition(
    bundleOrBlock: string | RenderedFieldListItem,
    maybeFieldListType: ValidFieldListTypes | null,
    maybeParentBundle: BlockBundleWithNested | null,
  ): BlockDefinition | undefined {
    const bundle =
      typeof bundleOrBlock === 'string' ? bundleOrBlock : bundleOrBlock.bundle
    const block = typeof bundleOrBlock === 'object' ? bundleOrBlock : null
    const fieldListType = maybeFieldListType || block?.fieldListType
    const parentBundle = maybeParentBundle || block?.parentBlockBundle
    const forFieldListType = bundle + '__field:' + fieldListType
    if (blocksByKey.value[forFieldListType]) {
      return blocksByKey.value[forFieldListType]
    }
    if (parentBundle) {
      const forParentBundle = bundle + '__parent:' + parentBundle
      if (blocksByKey.value[forParentBundle]) {
        return blocksByKey.value[forParentBundle]
      }
    }
    const forProviderType = bundle + '__provider:' + providerType
    if (blocksByKey.value[forProviderType]) {
      return blocksByKey.value[forProviderType]
    }

    return blocksByKey.value[bundle]
  }

  function getFragmentDefinition(name: string): FragmentDefinition | undefined {
    return fragmentsByName.value[name]
  }

  function getProviderDefinition(
    entityType: string,
    entityBundle: string,
  ): ProviderDefinition | undefined {
    const key = `${entityType}:${entityBundle}`
    return providersByName.value[key]
  }

  function getDefaultDefinition(bundle: string): BlockDefinition | undefined {
    return blocksByKey.value[bundle]
  }

  function getBlockIcon(bundle: string): string | undefined {
    return blockIcons.value[bundle]
  }

  function getBlockImage(bundle: string): string | undefined {
    return blockImages.value[bundle]
  }

  const bundlesWithAutoAdd = computed<string[]>(() => {
    return blocks.value
      .filter((v) => {
        const addBehaviour = v.editor?.addBehaviour ?? 'form'
        return (
          addBehaviour === 'no-form' || addBehaviour.startsWith('editable:')
        )
      })
      .map((v) => v.bundle)
  })

  return {
    getBlockDefinition,
    getFragmentDefinition,
    getProviderDefinition,
    getDefaultDefinition,
    getBlockIcon,
    getBlockImage,
    fragmentDefinitions: computed(() => fragments.value),
    blockDefinitions: computed(() => blocks.value),
    globalOptions: readonly(allGlobalOptions),
    runtimeOptions: readonly(runtimeOptions),
    renderKey: readonly(renderKey),
    bundlesWithAutoAdd,
  }
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
