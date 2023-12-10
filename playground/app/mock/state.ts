import type { BlokkliOwner } from '#blokkli/helpers/stateProvider'
import type { BlokkliFieldList, BlokkliFieldListConfig } from '#blokkli/types'
import { BlockText, BlockTitle } from './state/Block'
import { EditState } from './state/EditState'
import { ContentPage } from './state/Entity'
import type { FieldBlocks } from './state/Field'

const LOREM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`

export type MockState = {
  pages: ContentPage[]
  owner: {
    id: string
    name: string
  }
  editState: EditState
}

export const createPage = () => {
  const page = new ContentPage('1')

  for (let i = 0; i < 3; i++) {
    const block = new BlockText((i + 1).toString())
    block.text().setText(LOREM)
    page.content().append(block)
  }

  for (let i = 0; i < 3; i++) {
    const block = new BlockTitle((i + 4).toString())
    block.title().setText('Title ' + (i + 1))
    page.content().append(block)
  }
  return page
}

export const editState = new EditState('1')
export const state: MockState = {
  pages: [createPage()],
  owner: {
    id: '1',
    name: 'John Wayne',
  },
  editState,
}

export function mapMockField(field: FieldBlocks) {
  const list: BlokkliFieldList<any>[] = field.getBlocks().map((block) => {
    const props = { ...block.fields }
    delete props.options
    return {
      item: {
        uuid: block.uuid,
        entityBundle: block.bundle,
        options: block.options().getOptions(),
      },
      props,
    }
  })
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
