import type { FieldListItem } from '#blokkli/types'
import { entityStorageManager } from './entityStorage'
import type { Block } from './state/Block/Block'
import { EditState } from './state/EditState'
import type { FieldBlocks } from './state/Field/Blocks'

export type MockState = {
  owner: {
    id: string
    name: string
  }
  editState: EditState
}

export const editState = new EditState('1')
export const state: MockState = {
  owner: {
    id: '1',
    name: 'John Wayne',
  },
  editState,
}

export function mapBlockItem(
  block: Block,
  overrideOptions?: Record<string, string>,
): FieldListItem {
  const props = block.getProps()
  delete props.options
  return {
    uuid: block.uuid,
    bundle: block.bundle,
    isVisible: true, // @todo: Return proper value.
    options: JSON.parse(
      JSON.stringify(overrideOptions || block.options().getOptions()),
    ),
    props,
    editContext: block.getEditContext(),
  }
}

export function mapMockField(field: FieldBlocks): FieldListItem[] {
  return field.getBlocks().map((v) => mapBlockItem(v))
}

export const getEditState = (
  _entityType: string,
  _entityUuid: string,
): EditState => {
  return editState
}

export const exportState = async () => {
  const page = entityStorageManager.getContent('1')
  if (!page) {
    throw new Error('Page not found')
  }
  const result = await editState.getMutatedState(page)

  // Build a map of proxy blocks by UUID (these have the mutated values)
  const proxyMap = new Map<
    string,
    { block: Block; overrideOptions: Record<string, string> }
  >()
  result.context.proxies.forEach((proxy) => {
    if (!proxy.isDeleted) {
      proxyMap.set(proxy.block.uuid, {
        block: proxy.block,
        overrideOptions: proxy.overrideOptions,
      })
    }
  })

  const fields = result.fields.map((v) => {
    return {
      name: v.name,
      entityType: v.entityType,
      entityUuid: v.entityUuid,
      field: v.list.map((v) => v.uuid),
    }
  })

  const libraryItems = entityStorageManager.storages.library_item
    .loadAll()
    .map((v) => {
      return {
        uuid: v.uuid,
        title: v.title(),
        block: v.getBlocks().list[0]?.uuid,
      }
    })

  const usedBlocks = [
    ...fields.flatMap((v) => v.field),
    ...libraryItems.map((v) => v.block),
  ]

  const blocks = entityStorageManager.storages.block
    .loadAll()
    .filter((v) => usedBlocks.includes(v.uuid))
    .map((storageBlock) => {
      // Use proxy block if available (has mutated values), otherwise use storage
      const proxyData = proxyMap.get(storageBlock.uuid)
      const block = proxyData?.block || storageBlock
      const values: Record<string, any> = {
        ...block.getValues(),
        isNew: [false],
      }

      // Merge override options if present
      if (
        proxyData?.overrideOptions &&
        Object.keys(proxyData.overrideOptions).length > 0
      ) {
        const existingOptions: Array<{ key: string; value: string }> =
          values.options || []
        const optionsMap = new Map(existingOptions.map((o) => [o.key, o.value]))
        Object.entries(proxyData.overrideOptions).forEach(([key, value]) => {
          optionsMap.set(key, value)
        })
        values.options = Array.from(optionsMap.entries()).map(
          ([key, value]) => ({ key, value }),
        )
      }

      return {
        entityType: 'block' as const,
        bundle: block.bundle,
        uuid: block.uuid,
        values,
      }
    })

  return { fields, blocks, libraryItems }
}
