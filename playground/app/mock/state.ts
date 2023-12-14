import type { BlokkliFieldList, BlokkliFieldListConfig } from '#blokkli/types'
import { entityStorageManager, createPage } from './entityStorage'
import type { Block } from './state/Block/Block'
import { EditState } from './state/EditState'
import { ContentPage } from './state/Entity/Content'
import type { FieldBlocks } from './state/Field/Blocks'

export type MockState = {
  pages: ContentPage[]
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

export function mapBlockItem(block: Block): BlokkliFieldList<any> {
  const props = block.getProps()
  delete props.options
  return {
    item: {
      uuid: block.uuid,
      entityBundle: block.bundle,
      options: JSON.parse(JSON.stringify(block.options().getOptions().mock)),
    },
    props,
  }
}

export function mapMockField(field: FieldBlocks) {
  const list: BlokkliFieldList<any>[] = field.getBlocks().map(mapBlockItem)
  const fieldConfig: BlokkliFieldListConfig = {
    name: field.id,
    label: field.label,
    storage: {
      cardinality: field.cardinality,
    },
  }

  return {
    list,
    fieldConfig,
    canEdit: true,
    entity: {
      uuid: field.entity.uuid,
      entityTypeId: field.entity.entityType,
      entityBundle: field.entity.bundle,
    },
  }
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
      field: v.list.map((v) => v.item?.uuid),
    }
  })

  console.log(JSON.stringify(fields))

  console.log(JSON.stringify(entityStorageManager.storages.block.loadAll()))
}

// exportState()
// throw new Error('Exported')
