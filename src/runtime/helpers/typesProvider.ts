import { type ComputedRef } from 'vue'
import type {
  FieldConfig,
  BlockBundleDefinition,
  EditableFieldConfig,
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
  DroppableFieldConfig,
  DraggableExistingBlock,
  EntityContext,
} from '../types'
import type { AdapterContext, BlokkliAdapter } from '../adapter'
import type { SelectionProvider } from './selectionProvider'
import { eventBus } from '#blokkli/helpers/eventBus'
import { useRuntimeConfig, computed, watch } from '#imports'
import { getDefinition } from '#blokkli/definitions'

export type BlokkliBlockType = BlockBundleDefinition & {
  definition:
    | BlockDefinitionInput<BlockDefinitionOptionsInput, any[]>
    | undefined
}

export type BlockDefinitionProvider = {
  itemBundlesWithNested: ComputedRef<string[]>
  allowedTypesInList: ComputedRef<string[]>
  generallyAvailableBundles: ComputedRef<BlockBundleDefinition[]>
  allTypes: ComputedRef<BlockBundleDefinition[]>
  getType: (bundle: string) => BlokkliBlockType | undefined
  fieldConfig: ComputedRef<FieldConfig[]>
  editableFieldConfig: ComputedRef<EditableFieldConfig[]>
  droppableFieldConfig: ComputedRef<DroppableFieldConfig[]>
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
  const allTypesData = await adapter.getAllBundles()
  const allTypes = computed(() => allTypesData || [])
  const itemEntityType = useRuntimeConfig().public.blokkli.itemEntityType

  const loadedFieldConfig = await adapter.getFieldConfig()
  const fieldConfig = computed(() => loadedFieldConfig)
  const loadedEditableFieldConfig = adapter.getEditableFieldConfig
    ? await adapter.getEditableFieldConfig()
    : []
  const loadedDroppableFieldConfig = adapter.getDroppableFieldConfig
    ? await adapter.getDroppableFieldConfig()
    : []
  const editableFieldConfig = computed(() => loadedEditableFieldConfig)
  const droppableFieldConfig = computed(() => loadedDroppableFieldConfig)

  /**
   * The allowed bundles in the current field item list.
   *
   * This always uses the parent field of the selected blocks to determine the allowed types.
   */
  const allowedTypesInList = computed(() => {
    if (!selection.blocks.value.length) {
      return []
    }

    // Iterate over blocks to determine if they are all part of the same field.
    let hostType = ''
    let hostBundle = ''
    let fieldName = ''
    for (let i = 0; i < selection.blocks.value.length; i++) {
      const block = selection.blocks.value[i]
      if (i !== 0) {
        if (
          hostType !== block.hostType ||
          hostBundle !== block.hostBundle ||
          fieldName !== block.hostFieldName
        ) {
          // Not all blocks are in the same field. Return empty array.
          return []
        }
      }
      hostType = block.hostType
      hostBundle = block.hostBundle
      fieldName = block.hostFieldName
    }

    return fieldConfig.value
      .filter(
        (v) =>
          v.entityType === hostType &&
          v.entityBundle === hostBundle &&
          v.name === fieldName,
      )
      .flatMap((v) => v.allowedBundles)
      .filter(Boolean) as string[]
  })

  watch(selection.blocks, () => {
    if (selection.blocks.value.length !== 1) {
      return
    }
    const item = selection.blocks.value[0]
    // Determine if the selected item has nested items.
    const hasNested = itemBundlesWithNested.value.includes(item.itemBundle)
    if (hasNested) {
      // Get the nested item fields.
      const nestedFields =
        fieldConfig.value
          .filter(
            (v) =>
              v.entityType === itemEntityType &&
              v.entityBundle === item.itemBundle,
          )
          .map((v) => v.name) || []

      // When we have exactly one nested item field, we can set the active
      // field key to this field. That way the UI will show this field is active
      // and display available items for this field.
      if (nestedFields.length === 1) {
        eventBus.emit('setActiveFieldKey', `${item.uuid}:${nestedFields[0]}`)
        return
      }
    }
    eventBus.emit('setActiveFieldKey', `${item.hostUuid}:${item.hostFieldName}`)
  })

  /**
   * All item bundles that themselves have nested items.
   */
  const itemBundlesWithNested = computed<string[]>(() => {
    return (
      fieldConfig.value
        .filter((v) => v.entityType === itemEntityType)
        .map((v) => v.entityBundle) || []
    )
  })

  const getType = (bundle: string): BlokkliBlockType | undefined => {
    const type = allTypes.value.find((v) => v.id === bundle)
    const definition = getDefinition(bundle)
    if (type) {
      return {
        ...type,
        definition,
      }
    }
  }

  const getDroppableFieldConfig = (
    fieldName: string,
    host: DraggableExistingBlock | EntityContext,
  ): DroppableFieldConfig => {
    const entityType = 'entityType' in host ? host.entityType : host.type
    const entityBundle = 'itemBundle' in host ? host.itemBundle : host.bundle
    const config = droppableFieldConfig.value.find((v) => {
      if (v.name !== fieldName) {
        return false
      }

      if (v.entityType !== entityType) {
        return false
      }

      if (v.entityBundle !== entityBundle) {
        return false
      }

      return true
    })

    if (!config) {
      throw new Error(
        `Missing droppable field config for field name "${fieldName}" on entity type "${entityType}" of bundle "${entityBundle}"`,
      )
    }

    return config
  }

  const generallyAvailableBundles = computed(() => {
    const typesOnEntity = (
      fieldConfig.value.filter((v) => {
        return (
          v.entityType === context.value.entityType &&
          v.entityBundle === context.value.entityBundle
        )
      }) || []
    )
      .flatMap((v) => v.allowedBundles)
      .filter(Boolean)

    const typesOnItems =
      fieldConfig.value
        .filter((v) => {
          return typesOnEntity.includes(v.entityBundle)
        })
        .flatMap((v) => v.allowedBundles) || []

    const allAllowedTypes = [...typesOnEntity, ...typesOnItems]

    return (
      allTypes.value.filter((v) => v.id && allAllowedTypes.includes(v.id)) || []
    )
  })

  return {
    itemBundlesWithNested,
    allowedTypesInList,
    allTypes,
    getType,
    fieldConfig,
    editableFieldConfig,
    droppableFieldConfig,
    getDroppableFieldConfig,
    generallyAvailableBundles,
  }
}
