import type { BlokkliFieldList, BlokkliFieldListConfig } from '#blokkli/types'
import { entityStorageManager } from './entityStorage'
import { BlockCard } from './state/Block/Card'
import { BlockGrid } from './state/Block/Grid'
import { EditState } from './state/EditState'
import { ContentPage } from './state/Entity/Content'
import type { FieldBlocks } from './state/Field/Blocks'

const LOREM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`

export type MockState = {
  pages: ContentPage[]
  owner: {
    id: string
    name: string
  }
  editState: EditState
}

const initData = () => {
  entityStorageManager.createImage(
    '1',
    '/search.png',
    'Search functionality in Blokkli',
  )

  entityStorageManager.createImage(
    '2',
    '/code.png',
    'Vue Component of a Blokkli Block',
  )

  entityStorageManager.createImage(
    '3',
    '/editor-screenshot.png',
    'Vue Component of a Blokkli Block',
  )

  entityStorageManager.createImage(
    '4',
    '/toolbar.png',
    'Vue Component of a Blokkli Block',
  )
}

initData()

export const createPage = () => {
  const page = new ContentPage('1')

  // const grid = entityStorageManager.createBlock('grid', '1') as BlockGrid
  // const card = entityStorageManager.createBlock('card', '2') as BlockCard
  // card.setValues({
  //   title: 'Card A',
  //   text: 'This is card A',
  //   options: [{ key: 'box', value: '1' }],
  // })
  // const cardCopy1 = entityStorageManager.cloneBlock(card, '3')
  // const cardCopy2 = entityStorageManager.cloneBlock(card, '4')
  // cardCopy1.setValues({ title: 'Card B', text: 'This is card B' })
  // cardCopy2.setValues({ title: 'Card C', text: 'This is card C' })
  // grid.blocks().append(card)
  // grid.blocks().append(cardCopy1)
  // grid.blocks().append(cardCopy2)
  // page.content().append(grid)
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

export const getEditState = (
  entityType: string,
  entityUuid: string,
): EditState => {
  return editState
}

export const getPage = (uuid: string): ContentPage => {
  return createPage()
}
