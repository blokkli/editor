import type { DomProvider } from './dom'
import type { StateProvider } from './state'
import {
  fragmentBlockBundle,
  fromLibraryBlockBundle,
  itemEntityType,
} from '#blokkli-build/config'
import { onBlokkliEvent } from '#blokkli/editor/composables'
import type {
  BlockBundleWithNested,
  FieldListItemTyped,
} from '#blokkli-build/generated-types'
import type { AdapterContext } from '#blokkli/editor/adapter'
import { type ComputedRef, ref } from '#imports'
import type { BlokkliFragmentName } from '#blokkli-build/definitions'
import type { MutatedField } from '../types/state'
import type { RenderedFieldListItem } from '../types/field'

export type BlocksProvider = {
  /**
   * Get a rendered block by its UUID.
   *
   * Returns a RenderedFieldListItem with complete block metadata including:
   * - Host entity and field information
   * - Publishing status and schedule
   * - Library/fragment data (if applicable)
   * - Parent block bundle (for nested blocks)
   *
   * Results are cached and invalidated on state reload.
   *
   * @param uuid - The block's UUID
   * @returns The rendered block item, or undefined if not found
   */
  getBlock: (uuid: string) => RenderedFieldListItem | undefined

  /**
   * Get all rendered blocks in the current state.
   *
   * Returns an array of all blocks with complete metadata.
   * Iterates through all UUIDs in state and builds RenderedFieldListItem for each.
   *
   * @returns Array of all rendered block items
   */
  getAllBlocks: () => RenderedFieldListItem[]
}

export default function (
  state: StateProvider,
  dom: DomProvider,
  context: ComputedRef<AdapterContext>,
): BlocksProvider {
  const renderedFieldListItemCache = new Map<string, RenderedFieldListItem>()
  const refreshKey = ref(1)

  function getParentBlockBundle(
    field: MutatedField,
  ): BlockBundleWithNested | null {
    if (field.entityType !== itemEntityType) {
      return null
    }

    const block = state.getFieldListItem(field.entityUuid)
    if (!block) {
      return null
    }

    return block.bundle as BlockBundleWithNested
  }

  function getLibraryData(
    item: FieldListItemTyped,
  ): { label: string; libraryItemUuid: string; reusableBundle: string } | null {
    if (item.bundle === fromLibraryBlockBundle && item.props.libraryItem) {
      const uuid = item.props.libraryItem.uuid
      const bundle = item.props.libraryItem.block?.bundle
      if (uuid && bundle) {
        return {
          label: item.props.libraryItem.label ?? '',
          libraryItemUuid: uuid,
          reusableBundle: bundle,
        }
      }
    }

    return null
  }

  function getFragmentData(
    item: FieldListItemTyped,
  ): { name: BlokkliFragmentName } | null {
    if (item.bundle === fragmentBlockBundle && item.props.name) {
      return {
        name: item.props.name as BlokkliFragmentName,
      }
    }

    return null
  }

  function getBlock(uuid: string): RenderedFieldListItem | undefined {
    // The key is never 0, but we have it here so that all calls to this method
    // are reactive when the refresh key updates.
    if (refreshKey.value === 0) {
      return
    }

    const cached = renderedFieldListItemCache.get(uuid)
    if (cached) {
      return cached
    }

    const item = state.getFieldListItem(uuid)
    if (!item) {
      return
    }

    if (!item.editContext) {
      throw new Error('Missing editContext on block with UUID: ' + item.uuid)
    }

    const fieldList = state.getFieldListForBlock(item.uuid)

    if (!fieldList) {
      return
    }

    const field = dom.getRegisteredField(fieldList.entityUuid, fieldList.name)

    const parentBlockBundle = getParentBlockBundle(fieldList)

    const renderedItem: RenderedFieldListItem = {
      uuid: item.uuid,
      bundle: item.bundle,
      isNew: item.editContext.isNew,
      isPublished: item.editContext.isPublished,
      publishOn: item.editContext.publishOn,
      unpublishOn: item.editContext.unpublishOn,
      outdatedTranslations: item.editContext.outdatedTranslations ?? [],
      isNested: fieldList.entityType === itemEntityType,
      fieldListType: field?.fieldListType ?? 'default',
      library: getLibraryData(item as any),
      fragment: getFragmentData(item as any),
      parentBlockBundle,
      host: {
        type: fieldList.entityType,
        uuid: fieldList.entityUuid,
        fieldName: fieldList.name,
        bundle: parentBlockBundle ?? context.value.entityBundle,
      },
    }

    renderedFieldListItemCache.set(item.uuid, renderedItem)
    return renderedItem
  }

  function getAllBlocks(): RenderedFieldListItem[] {
    // The key is never 0, but we have it here so that all calls to this method
    // are reactive when the refresh key updates.
    if (refreshKey.value === 0) {
      return []
    }

    const blocks: RenderedFieldListItem[] = []
    const uuids = state.getAllUuids()

    for (let i = 0; i < uuids.length; i++) {
      const uuid = uuids[i]
      if (!uuid) {
        continue
      }

      const block = getBlock(uuid)
      if (!block) {
        continue
      }

      blocks.push(block)
    }

    return blocks
  }

  onBlokkliEvent('state:reloaded', () => {
    renderedFieldListItemCache.clear()
    refreshKey.value++
  })

  return {
    getBlock,
    getAllBlocks,
  }
}
