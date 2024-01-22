import { type ComputedRef } from 'vue'
import { useRuntimeConfig, computed, watch } from '#imports'
import type {
  FieldConfig,
  BlockBundleDefinition,
  EditableFieldConfig,
  BlockDefinitionInput,
  BlockDefinitionOptionsInput,
} from '../types'
import { eventBus } from '#blokkli/helpers/eventBus'
import type { BlokkliAdapter } from '../adapter'
import type { SelectionProvider } from './selectionProvider'
import {
  getDefinition,
  type PossibleDefinitionBundle,
} from '#blokkli/definitions'

export type BlokkliBlockType = BlockBundleDefinition & {
  definition:
    | BlockDefinitionInput<
        BlockDefinitionOptionsInput,
        any[],
        PossibleDefinitionBundle
      >
    | undefined
}

export type BlockDefinitionProvider = {
  itemBundlesWithNested: ComputedRef<string[]>
  allowedTypesInList: ComputedRef<string[]>
  allTypes: ComputedRef<BlockBundleDefinition[]>
  getType: (bundle: string) => BlokkliBlockType | undefined
  fieldConfig: ComputedRef<FieldConfig[]>
  editableFieldConfig: ComputedRef<EditableFieldConfig[]>
}

export default async function (
  adapter: BlokkliAdapter<any>,
  selection: SelectionProvider,
): Promise<BlockDefinitionProvider> {
  const allTypesData = await adapter.getAllBundles()
  const allTypes = computed(() => allTypesData || [])
  const itemEntityType = useRuntimeConfig().public.blokkli.itemEntityType

  const loadedFieldConfig = await adapter.getFieldConfig()
  const fieldConfig = computed(() => loadedFieldConfig)
  const loadedEditableFieldConfig = adapter.getEditableFieldConfig
    ? await adapter.getEditableFieldConfig()
    : []
  const editableFieldConfig = computed(() => loadedEditableFieldConfig)

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

  return {
    itemBundlesWithNested,
    allowedTypesInList,
    allTypes,
    getType,
    fieldConfig,
    editableFieldConfig,
  }
}
