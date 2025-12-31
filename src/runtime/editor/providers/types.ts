import type { ComputedRef } from 'vue'
import type {
  FieldConfig,
  DraggableExistingBlock,
  EntityContext,
} from '../../types'
import type { AdapterContext, BlokkliAdapter } from '../adapter'
import type { SelectionProvider } from './selection'
import { computed } from '#imports'
import { onlyUnique } from '../../helpers'
import { itemEntityType } from '#blokkli-build/config'
import type {
  DroppableFieldConfig,
  EditableFieldConfig,
} from '../features/editable-field/types'
import type { BlockBundleDefinition } from '../types/definitions'
import type {
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
} from '#blokkli/types/definitions'

export type BlokkliBlockType = BlockBundleDefinition & {
  definition:
    | BlockDefinitionInput<BlockDefinitionOptionsInput, never[]>
    | undefined
}

/**
 * Base interface for configuration objects that can be mapped by entity context.
 *
 * Used by ConfigMap to organize configuration data by entity type, bundle, and name
 * for efficient lookup.
 */
interface MappableConfig {
  /**
   * The entity type (e.g., 'paragraph', 'node', 'block_content').
   */
  entityType: string

  /**
   * The entity bundle (e.g., 'text', 'image', 'article').
   */
  entityBundle: string

  /**
   * The configuration name (typically a field name like 'field_paragraphs').
   */
  name: string
}

/**
 * Efficient lookup map for configuration objects organized by entity context.
 *
 * Provides O(1) lookups by entity type, entity type + bundle, and
 * entity type + bundle + name combinations. Used for field configurations,
 * editable field configurations, and droppable field configurations.
 *
 * @template T - Configuration type extending MappableConfig
 */
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

  /**
   * Get all configurations for a specific entity type.
   *
   * @param entityType - The entity type to filter by
   * @returns Array of matching configurations
   *
   * @example
   * ```ts
   * // Get all field configs for paragraph entities
   * const paragraphFields = fieldConfig.forEntityType('paragraph')
   * ```
   */
  forEntityType(entityType: string): T[] {
    return this.mapEntityType[entityType] || []
  }

  /**
   * Get all configurations for a specific entity type and bundle combination.
   *
   * @param entityType - The entity type
   * @param entityBundle - The entity bundle
   * @returns Array of matching configurations
   *
   * @example
   * ```ts
   * // Get all field configs for text paragraph bundle
   * const textFields = fieldConfig.forEntityTypeAndBundle('paragraph', 'text')
   * ```
   */
  forEntityTypeAndBundle(entityType: string, entityBundle: string): T[] {
    return this.mapEntityTypeBundle[entityType]?.[entityBundle] || []
  }

  /**
   * Get a specific configuration by entity type, bundle, and name.
   *
   * @param entityType - The entity type
   * @param entityBundle - The entity bundle
   * @param name - The configuration name (typically field name)
   * @returns The matching configuration, or undefined if not found
   *
   * @example
   * ```ts
   * // Get field config for specific field on text paragraph
   * const config = fieldConfig.forName('paragraph', 'text', 'field_items')
   * ```
   */
  forName(
    entityType: string,
    entityBundle: string,
    name: string,
  ): T | undefined {
    return this.mapEntityTypeBundleName[entityType]?.[entityBundle]?.[name]
  }

  /**
   * Get all configurations.
   *
   * @returns Array of all configurations in the map
   */
  all(): T[] {
    return this.configs
  }
}

export type BlockDefinitionProvider = {
  /**
   * List of block bundles that contain nested blocks.
   *
   * A bundle is included if it has any field configurations
   * where it can contain other blocks.
   */
  itemBundlesWithNested: string[]

  /**
   * Allowed block types in the currently selected list.
   *
   * Computed based on the parent field of selected blocks.
   * Returns empty array if:
   * - No blocks are selected
   * - Selected blocks are in different fields
   */
  allowedTypesInList: ComputedRef<string[]>

  /**
   * Block bundles that can be used somewhere in the current context.
   *
   * Includes bundles allowed:
   * - Directly on the current entity
   * - In nested blocks allowed on the current entity
   *
   * Used for add dialogs, library, and other "available blocks" UIs.
   */
  generallyAvailableBundles: BlockBundleDefinition[]

  /**
   * Get the bundle definition for a specific block type.
   *
   * @param bundle - The block bundle ID (e.g., 'text', 'image')
   * @returns The bundle definition, or undefined if not found
   */
  getBlockBundleDefinition: (
    bundle: string,
  ) => BlockBundleDefinition | undefined

  /**
   * Get the field configuration for a specific field on an entity.
   *
   * Field configurations define allowed bundles, cardinality, and other
   * field-level settings.
   *
   * @param entityType - The entity type
   * @param entityBundle - The entity bundle
   * @param fieldName - The field name
   * @returns The field configuration, or undefined if not found
   */
  getFieldConfig: (
    entityType: string,
    entityBundle: string,
    fieldName: string,
  ) => FieldConfig | undefined

  /**
   * Map of all field configurations.
   *
   * Provides efficient lookups by entity type, bundle, and field name.
   */
  fieldConfig: ConfigMap<FieldConfig>

  /**
   * Map of editable field configurations.
   *
   * Defines which fields support inline editing and their configuration.
   */
  editableFieldConfig: ConfigMap<EditableFieldConfig>

  /**
   * Map of droppable field configurations.
   *
   * Defines which fields can accept dropped blocks and their behavior.
   */
  droppableFieldConfig: ConfigMap<DroppableFieldConfig>

  /**
   * Get droppable field configuration for a field on a host.
   *
   * Throws an error if configuration is not found, as droppable fields
   * should always have configuration when accessed.
   *
   * @param fieldName - The field name
   * @param host - The host block or entity context
   * @returns The droppable field configuration
   * @throws Error if configuration not found
   */
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
