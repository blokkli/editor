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
} from '#blokkli-build/generated-types'
import type { DeepReadonly } from 'vue'
import type { BlockDefinitionOptionsInput } from '../types'
import {
  OPTIONS,
  type RuntimeBlockOptionArray,
} from '#blokkli-build/runtime-options'

export type DefinitionProvider = {
  getBlockDefinition: (
    bundle: string,
    fieldListType: ValidFieldListTypes,
    parentBundle?: BlockBundleWithNested | null,
  ) => BlockDefinition | undefined
  getDefaultDefinition: (bundle: string) => BlockDefinition | undefined

  getFragmentDefinition: (name: string) => FragmentDefinition | undefined
  getProviderDefinition: (
    entityType: string,
    entityBundle: string,
  ) => ProviderDefinition | undefined

  getBlockIcon: (bundle: string) => string | undefined

  fragmentDefinitions: ComputedRef<FragmentDefinition[]>
  blockDefinitions: ComputedRef<BlockDefinition[]>
  globalOptions: DeepReadonly<Ref<BlockDefinitionOptionsInput>>
  runtimeOptions: DeepReadonly<
    Ref<Record<string, Record<string, RuntimeBlockOptionArray>>>
  >
  renderKey: DeepReadonly<Ref<string>>
}

export default function (): DefinitionProvider {
  const blocks = ref<BlockDefinition[]>(definitions.blocks)
  const fragments = ref<FragmentDefinition[]>(definitions.fragments)
  const providers = ref<ProviderDefinition[]>(definitions.providers)
  const renderKey = ref(definitions.renderKey)

  const blockIcons = ref<Record<string, string>>(definitions.icons)
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
    bundle: string,
    fieldListType: ValidFieldListTypes,
    parentBundle?: BlockBundleWithNested | null,
  ): BlockDefinition | undefined {
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

  return {
    getBlockDefinition,
    getFragmentDefinition,
    getProviderDefinition,
    getDefaultDefinition,
    getBlockIcon,
    fragmentDefinitions: computed(() => fragments.value),
    blockDefinitions: computed(() => blocks.value),
    globalOptions: readonly(allGlobalOptions),
    runtimeOptions: readonly(runtimeOptions),
    renderKey: readonly(renderKey),
  }
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
