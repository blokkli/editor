import type { ComputedRef } from 'vue'
import type {
  FieldConfig,
  BlockBundleDefinition,
  EditableFieldConfig,
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
  DroppableFieldConfig,
  DraggableExistingBlock,
  EntityContext,
} from '../../types'
import type { AdapterContext, BlokkliAdapter } from '../../adapter'
import type { SelectionProvider } from './selection'
import { useRuntimeConfig, computed } from '#imports'
import { onlyUnique } from '..'

export type BlokkliBlockType = BlockBundleDefinition & {
  definition:
    | BlockDefinitionInput<BlockDefinitionOptionsInput, never[]>
    | undefined
}

interface MappableConfig {
  entityType: string
  entityBundle: string
  name: string
}

class ConfigMap<T extends MappableConfig> {
  private configs: T[] = []
  private mapEntityType: Record<string, T[]> = {}
  private mapEntityTypeBundle: Record<string, Record<string, T[]>> = {}
  private mapEntityTypeBundleName: Record<
    string,
    Record<string, Record<string, T>>
  > = {}

  constructor(items: T[]) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      this.configs.push(item)

      // Map by entity type.
      if (!this.mapEntityType[item.entityType]) {
        this.mapEntityType[item.entityType] = []
      }
      this.mapEntityType[item.entityType]!.push(item)

      // Map by entity type and bundle.
      if (!this.mapEntityTypeBundle[item.entityType]) {
        this.mapEntityTypeBundle[item.entityType] = {}
      }

      if (!this.mapEntityTypeBundle[item.entityType]![item.entityBundle]) {
        this.mapEntityTypeBundle[item.entityType]![item.entityBundle] = []
      }

      this.mapEntityTypeBundle[item.entityType]![item.entityBundle]!.push(item)

      // Map by entity type, bundle and name.
      if (!this.mapEntityTypeBundleName[item.entityType]) {
        this.mapEntityTypeBundleName[item.entityType] = {}
      }

      if (!this.mapEntityTypeBundleName[item.entityType]![item.entityBundle]) {
        this.mapEntityTypeBundleName[item.entityType]![item.entityBundle] = {}
      }
      this.mapEntityTypeBundleName[item.entityType]![item.entityBundle]![
        item.name
      ] = item
    }
  }

  forEntityType(entityType: string): T[] {
    return this.mapEntityType[entityType] || []
  }

  forEntityTypeAndBundle(entityType: string, entityBundle: string): T[] {
    return this.mapEntityTypeBundle[entityType]?.[entityBundle] || []
  }

  forName(
    entityType: string,
    entityBundle: string,
    name: string,
  ): T | undefined {
    return this.mapEntityTypeBundleName[entityType]?.[entityBundle]?.[name]
  }

  all(): T[] {
    return this.configs
  }
}

export type BlockDefinitionProvider = {
  itemBundlesWithNested: string[]
  allowedTypesInList: ComputedRef<string[]>
  generallyAvailableBundles: BlockBundleDefinition[]
  getBlockBundleDefinition: (
    bundle: string,
  ) => BlockBundleDefinition | undefined
  getFieldConfig: (
    entityType: string,
    entityBundle: string,
    fieldName: string,
  ) => FieldConfig | undefined
  fieldConfig: ConfigMap<FieldConfig>
  editableFieldConfig: ConfigMap<EditableFieldConfig>
  droppableFieldConfig: ConfigMap<DroppableFieldConfig>
  getDroppableFieldConfig: (
    fieldName: string,
    host: DraggableExistingBlock | EntityContext,
  ) => DroppableFieldConfig
}

export default async function (
  adapter: BlokkliAdapter<any>,
  selection: SelectionProvider,
  context: ComputedRef<AdapterContext>,
): Promise<BlockDefinitionProvider> {
  const bundleDefinitions = await adapter.getAllBundles()
  const itemEntityType = useRuntimeConfig().public.blokkli.itemEntityType

  const fieldConfig = new ConfigMap(await adapter.getFieldConfig())
  const editableFieldConfigData = adapter.getEditableFieldConfig
    ? await adapter.getEditableFieldConfig()
    : []
  const editableFieldConfig = new ConfigMap(editableFieldConfigData)
  const droppableFieldConfigData = adapter.getDroppableFieldConfig
    ? await adapter.getDroppableFieldConfig()
    : []

  const droppableFieldConfig = new ConfigMap(droppableFieldConfigData)

  /**
   * The allowed bundles in the current field item list.
   *
   * This always uses the parent field of the selected blocks to determine the allowed types.
   */
  const allowedTypesInList = computed(() => {
    if (!selection.items.value.length) {
      return []
    }

    // Iterate over blocks to determine if they are all part of the same field.
    let hostType = ''
    let hostBundle = ''
    let fieldName = ''
    for (let i = 0; i < selection.items.value.length; i++) {
      const block = selection.items.value[i]!
      if (
        i !== 0 &&
        (hostType !== block.host.type ||
          hostBundle !== block.host.bundle ||
          fieldName !== block.host.fieldName)
      ) {
        // Not all blocks are in the same field. Return empty array.
        return []
      }
      hostType = block.host.type
      hostBundle = block.host.bundle
      fieldName = block.host.fieldName
    }

    return (
      fieldConfig.forName(hostType, hostBundle, fieldName)?.allowedBundles || []
    )
  })

  /**
   * All item bundles that themselves have nested items.
   */
  const itemBundlesWithNested =
    fieldConfig.forEntityType(itemEntityType).map((v) => v.entityBundle) || []

  const typeMap = bundleDefinitions.reduce<
    Record<string, BlockBundleDefinition>
  >((acc, type) => {
    acc[type.id] = type
    return acc
  }, {})

  function getBlockBundleDefinition(
    bundle: string,
  ): BlockBundleDefinition | undefined {
    return typeMap[bundle]
  }

  function getFieldConfig(
    entityType: string,
    entityBundle: string,
    fieldName: string,
  ): FieldConfig | undefined {
    return fieldConfig.forName(entityType, entityBundle, fieldName)
  }

  function getDroppableFieldConfig(
    fieldName: string,
    host: DraggableExistingBlock | EntityContext,
  ): DroppableFieldConfig {
    const entityType = 'itemType' in host ? host.block.host.type : host.type
    const entityBundle =
      'itemType' in host ? host.block.host.bundle : host.bundle
    const config = droppableFieldConfig.forName(
      entityType,
      entityBundle,
      fieldName,
    )

    if (!config) {
      throw new Error(
        `Missing droppable field config for field name "${fieldName}" on entity type "${entityType}" of bundle "${entityBundle}"`,
      )
    }

    return config
  }

  const bundlesAllowedOnPage = fieldConfig
    .forEntityTypeAndBundle(
      context.value.entityType,
      context.value.entityBundle,
    )
    .flatMap((v) => v.allowedBundles)
    .filter(Boolean)

  const bundlesAllowedOnBlocks =
    bundlesAllowedOnPage
      .flatMap((bundle) =>
        fieldConfig.forEntityTypeAndBundle(itemEntityType, bundle),
      )
      .flatMap((v) => v.allowedBundles) || []

  const allAllowedBundles = [
    ...bundlesAllowedOnPage,
    ...bundlesAllowedOnBlocks,
  ].filter(onlyUnique)

  const generallyAvailableBundles = bundleDefinitions.filter((v) =>
    allAllowedBundles.includes(v.id),
  )

  return {
    itemBundlesWithNested,
    allowedTypesInList,
    getBlockBundleDefinition,
    getDroppableFieldConfig,
    generallyAvailableBundles,
    getFieldConfig,
    editableFieldConfig,
    droppableFieldConfig,
    fieldConfig,
  }
}
