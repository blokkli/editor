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
    options: JSON.parse(
      JSON.stringify(overrideOptions || block.options().getOptions()),
    ),
    props,
  }
}

export function mapMockField(field: FieldBlocks): FieldListItem[] {
  return field.getBlocks().map((v) => mapBlockItem(v))
}

export const getEditState = (
  entityType: string,
  entityUuid: string,
): EditState => {
  return editState
}

const exportState = () => {
  const page = entityStorageManager.getContent('1')
  const result = editState.getMutatedState(page, true)

  const fields = result.fields.map((v) => {
    return {
      name: v.name,
      entityType: v.entityType,
      entityUuid: v.entityUuid,
      field: v.list.map((v) => v.uuid),
    }
  })

  const allBlocks = entityStorageManager.storages.block.loadAll()

  const libraryItems = entityStorageManager.storages.library_item
    .loadAll()
    .map((v) => {
      return {
        uuid: v.uuid,
        title: v.title(),
        block: v.getBlocks().list[0].uuid,
      }
    })

  const data = {
    fields,
    blocks: allBlocks,
    libraryItems,
  }
  console.log(JSON.stringify(data))
}

// exportState()
// throw new Error('Exported')
