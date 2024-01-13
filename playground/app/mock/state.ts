import type { FieldListItem } from '#blokkli/types'
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

export function mapBlockItem(block: Block): FieldListItem {
  const props = block.getProps()
  delete props.options
  return {
    uuid: block.uuid,
    bundle: block.bundle,
    options: JSON.parse(JSON.stringify(block.options().getOptions())),
    props,
  }
}

export function mapMockField(field: FieldBlocks) {
  const list: FieldListItem[] = field.getBlocks().map(mapBlockItem)

  return {
    name: field.id,
    label: field.label,
    cardinality: field.cardinality,
    list,
    canEdit: true,
  }
}

export const getEditState = (
  entityType: string,
  entityUuid: string,
): EditState => {
  return editState
}

// const exportState = () => {
//   const page = entityStorageManager.getContent('1')
//   const result = editState.getMutatedState(page, true)

//   const fields = result.fields.map((v) => {
//     return {
//       name: v.name,
//       entityType: v.entityType,
//       entityUuid: v.entityUuid,
//       field: v.list.map((v) => v.item?.uuid),
//     }
//   })

//   console.log(JSON.stringify(fields))

//   console.log(JSON.stringify(entityStorageManager.storages.block.loadAll()))
// }

// exportState()
// throw new Error('Exported')
