import type { MutatedField, RenderedFieldListItem } from '#blokkli/types'
import type { DomProvider } from '../domProvider'
import type { StateProvider } from '../stateProvider'
import { itemEntityType } from '#blokkli-build/config'
import onBlokkliEvent from '../composables/onBlokkliEvent'
import type {
  BlockBundleWithNested,
  FieldListItemTyped,
} from '#blokkli-build/generated-types'
import type { AdapterContext } from '#blokkli/adapter'
import type { ComputedRef } from 'vue'

export type BlocksProvider = {
  getBlock: (uuid: string) => RenderedFieldListItem | undefined
  getAllBlocks: () => RenderedFieldListItem[]
}

export default function (
  state: StateProvider,
  dom: DomProvider,
  context: ComputedRef<AdapterContext>,
): BlocksProvider {
  const renderedFieldListItemCache = new Map<string, RenderedFieldListItem>()

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
    if (item.bundle === 'from_library' && item.props.libraryItem) {
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

  function getBlock(uuid: string): RenderedFieldListItem | undefined {
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
      isNested: fieldList.entityType === itemEntityType,
      fieldListType: field?.fieldListType ?? 'default',
      library: getLibraryData(item as any),
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
  })

  return {
    getBlock,
    getAllBlocks,
  }
}
