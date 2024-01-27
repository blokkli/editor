import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { FieldListItem } from '#blokkli/types'
import { getBlocks } from '~/helpers/minimalState'

type CustomMinimalState = {
  blocks: FieldListItem[]
}

const getPropsForNewBlock = (bundle: string) => {
  if (bundle === 'text') {
    return {
      text: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
    }
  } else if (bundle === 'title') {
    return {
      title: 'Hello world',
    }
  }

  return {}
}

export default defineBlokkliEditAdapter<CustomMinimalState>((ctx) => {
  const minimalState: CustomMinimalState = {
    blocks: getBlocks(),
  }

  const moveBlock = (uuid: string, afterUuid?: string) => {
    const blockIndex = minimalState.blocks.findIndex((v) => v.uuid === uuid)

    // Block does not exist.
    if (blockIndex === -1) {
      return false
    }

    // Remove the block from the array.
    const block = minimalState.blocks.splice(blockIndex, 1)[0]

    // Determine the index at which we have to insert the block.
    const afterIndex = afterUuid
      ? minimalState.blocks.findIndex((v) => v.uuid === afterUuid)
      : -1
    if (afterIndex === -1) {
      minimalState.blocks.push(block)
    } else {
      minimalState.blocks.splice(afterIndex + 1, 0, block)
    }

    return true
  }

  return {
    loadState() {
      return Promise.resolve(minimalState)
    },
    mapState(state) {
      return {
        currentIndex: -1,
        mutations: [],
        currentUserIsOwner: true,
        ownerName: '',
        mutatedState: {
          mutatedOptions: state.blocks.reduce<
            Record<string, Record<string, any>>
          >((acc, block) => {
            acc[block.uuid] = {}
            Object.entries(block.options || {}).forEach(([key, value]) => {
              acc[block.uuid][key] = value
            })
            return acc
          }, {}),
          fields: [
            {
              name: 'content_blocks',
              entityType: 'content',
              entityUuid: '1',
              list: state.blocks,
            },
          ],
        },
        entity: {
          label: 'Minimal Example',
          status: true,
          bundleLabel: 'Page',
        },
        translationState: {
          isTranslatable: false,
        },
      }
    },

    getAllBundles() {
      return Promise.resolve([
        {
          id: 'text',
          label: 'Text',
        },
        {
          id: 'horizontal_rule',
          label: 'Horizontal Rule',
        },
        {
          id: 'title',
          label: 'Title',
        },
      ])
    },

    getFieldConfig() {
      return Promise.resolve([
        {
          name: 'content_blocks',
          entityType: 'content',
          entityBundle: 'page',
          label: 'Blocks',
          cardinality: -1,
          canEdit: true,
          allowedBundles: ['title', 'text', 'horizontal_rule'],
        },
      ])
    },

    addNewBlock(e) {
      const newBlock = {
        uuid: Math.round(Date.now() + Math.random() * 100000000).toString(),
        bundle: e.type,
        props: getPropsForNewBlock(e.type),
      }

      const afterIndex = e.afterUuid
        ? minimalState.blocks.findIndex((v) => v.uuid === e.afterUuid)
        : -1

      if (afterIndex === -1) {
        minimalState.blocks.push(newBlock)
      } else {
        minimalState.blocks.splice(afterIndex + 1, 0, newBlock)
      }

      return Promise.resolve({
        success: true,
        state: minimalState,
      })
    },

    moveBlock(e) {
      const success = moveBlock(e.item.uuid, e.afterUuid)
      return Promise.resolve({ success, state: minimalState })
    },

    moveMultipleBlocks(e) {
      e.uuids.forEach((uuid) => moveBlock(uuid, e.afterUuid))
      return Promise.resolve({ success: true, state: minimalState })
    },

    deleteBlocks(uuids) {
      minimalState.blocks = minimalState.blocks.filter(
        (v) => !uuids.includes(v.uuid),
      )
      return Promise.resolve({ success: true, state: minimalState })
    },

    updateOptions(updates) {
      updates.forEach((update) => {
        const block = minimalState.blocks.find((v) => v.uuid === update.uuid)
        if (block) {
          if (!block.options) {
            block.options = {}
          }

          block.options[update.key] = update.value
        }
      })

      return Promise.resolve({ success: true, state: minimalState })
    },

    updateFieldValue(e) {
      const block = minimalState.blocks.find((v) => v.uuid === e.uuid)
      if (block) {
        // @ts-ignore
        block.props[e.fieldName] = e.fieldValue
      }
      return Promise.resolve({ success: true, state: minimalState })
    },
  }
})
