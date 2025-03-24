import { computed, ref, readonly, type Ref } from '#imports'
import type {
  BlockDefinition,
  FragmentDefinition,
  Definitions,
} from '#blokkli-build/definitions'
import definitions from '#blokkli-build/definitions'
import type {
  ValidFieldListTypes,
  BlockBundleWithNested,
} from '#blokkli-build/generated-types'
import type { DeepReadonly } from 'vue'
import type { BlockDefinitionOptionsInput } from '../types'
import {
  BLOCK_OPTIONS,
  type RuntimeBlockOptionArray,
} from '#blokkli-build/runtime-options'

export type DefinitionProvider = {
  getBlockDefinition: (
    bundle: string,
    fieldListType: ValidFieldListTypes,
    parentBundle?: BlockBundleWithNested,
  ) => BlockDefinition | undefined
  getDefaultDefinition: (bundle: string) => BlockDefinition | undefined

  getFragmentDefinition: (name: string) => FragmentDefinition | undefined

  getBlockIcon: (bundle: string) => string | undefined

  fragmentDefinitions: DeepReadonly<Ref<FragmentDefinition[]>>
  blockDefinitions: DeepReadonly<Ref<BlockDefinition[]>>
  globalOptions: DeepReadonly<Ref<BlockDefinitionOptionsInput>>
  runtimeOptions: DeepReadonly<
    Ref<Record<string, Record<string, RuntimeBlockOptionArray>>>
  >
}

export default function (): DefinitionProvider {
  const blockDefinitions = ref(definitions.blocks)
  const fragmentDefinitions = ref(definitions.fragments)
  const blockIcons = ref<Record<string, string>>(definitions.icons)
  const allGlobalOptions = ref<BlockDefinitionOptionsInput>(
    definitions.globalOptions,
  )
  const runtimeOptions =
    ref<Record<string, Record<string, RuntimeBlockOptionArray>>>(BLOCK_OPTIONS)

  if (import.meta.hot) {
    import.meta.hot.accept('#blokkli-build/definitions', (mod) => {
      const newDefinitions = mod as any as { default: Definitions } | undefined
      blockDefinitions.value = newDefinitions?.default?.blocks || []
      fragmentDefinitions.value = newDefinitions?.default?.fragments || []
      blockIcons.value = newDefinitions?.default?.icons || {}
      allGlobalOptions.value = newDefinitions?.default?.globalOptions || {}
    })
    import.meta.hot.accept('#blokkli-build/runtime-options', (mod) => {
      if (mod?.BLOCK_OPTIONS) {
        runtimeOptions.value = mod.BLOCK_OPTIONS
      }
    })
  }

  const blocksByKey = computed(() =>
    blockDefinitions.value.reduce<Record<string, BlockDefinition>>((acc, v) => {
      const renderForValue = v.renderFor || []
      const renderForList = Array.isArray(renderForValue)
        ? renderForValue
        : [renderForValue]

      if (renderForList.length) {
        renderForList.forEach((renderFor) => {
          if ('parentBundle' in renderFor) {
            acc[v.bundle + '__' + 'parent:' + renderFor.parentBundle] = v
          } else if ('fieldList' in renderFor) {
            acc[v.bundle + '__' + 'field:' + renderFor.fieldList] = v
          } else if ('fieldListType' in renderFor) {
            acc[v.bundle + '__' + 'field:' + renderFor.fieldListType] = v
          }
        })
      } else {
        acc[v.bundle] = v
      }
      return acc
    }, {}),
  )

  const fragmentsByName = computed(() =>
    fragmentDefinitions.value.reduce<Record<string, FragmentDefinition>>(
      (acc, v) => {
        acc[v.name] = v
        return acc
      },
      {},
    ),
  )

  function getBlockDefinition(
    bundle: string,
    fieldListType: ValidFieldListTypes,
    parentBundle?: BlockBundleWithNested,
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

  function getDefaultDefinition(bundle: string): BlockDefinition | undefined {
    return blocksByKey.value[bundle]
  }

  function getBlockIcon(bundle: string): string | undefined {
    return blockIcons.value[bundle]
  }

  return {
    getBlockDefinition,
    getFragmentDefinition,
    getDefaultDefinition,
    getBlockIcon,
    fragmentDefinitions: readonly(fragmentDefinitions),
    blockDefinitions: readonly(blockDefinitions),
    globalOptions: readonly(allGlobalOptions),
    runtimeOptions: readonly(runtimeOptions),
  }
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
