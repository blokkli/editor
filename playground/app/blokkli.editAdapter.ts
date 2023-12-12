import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { BlokkliAdapter, MutationResponseLike } from '#blokkli/adapter'
import { allTypes } from './mock/allTypes'
import { availableTypes } from './mock/availableTypes'
import { conversions } from './mock/conversions'
import { state, createPage, editState, getPage } from './mock/state'
import type { MutatedState } from './mock/state/EditState'
import { transforms } from './mock/transforms'

export default defineBlokkliEditAdapter((ctx) => {
  const mockResponse = (
    mutatedState: MutatedState,
  ): Promise<MutationResponseLike<MutatedState>> => {
    return Promise.resolve({
      data: {
        state: {
          action: {
            succcess: true,
            state: mutatedState,
          },
        },
      },
    })
  }

  const getEntity = () => getPage(ctx.value.entityUuid)

  const addMutation = (
    id: any,
    args: any,
  ): Promise<MutationResponseLike<MutatedState>> => {
    editState.addMutation(id, args)
    const entity = getEntity()
    const mutatedState = editState.getMutatedState(entity)
    return mockResponse(mutatedState)
  }

  const adapter: BlokkliAdapter<MutatedState> = {
    loadState() {
      const page = createPage()
      const mutatedState = editState.getMutatedState(page)
      return Promise.resolve(mutatedState)
    },
    getDisabledFeatures() {
      return Promise.resolve([])
    },
    getAllTypes() {
      return Promise.resolve(allTypes)
    },
    getAvailableTypes() {
      return Promise.resolve(availableTypes)
    },
    getConversions() {
      return Promise.resolve(conversions)
    },
    getTransformPlugins() {
      return Promise.resolve(transforms)
    },
    mapState(inputState) {
      return {
        currentIndex: editState.currentIndex,
        mutations: editState.getMutationItems(),
        currentUserIsOwner: true,
        ownerName: state.owner.name,
        mutatedState: {
          mutatedOptions: inputState.mutatedOptions,
          fields: inputState.fields,
          violations: [],
        },
        entity: {
          id: state.pages[0].uuid,
          label: 'Demo Page',
          status: true,
          bundleLabel: 'Page',
        },
        translationState: {
          isTranslatable: false,
        },
      }
    },
    revertAllChanges() {
      editState.revert()
      return mockResponse(editState.getMutatedState(getEntity()))
    },
    loadComments() {
      return Promise.resolve([])
    },
    addNewBlokkliItem: (e) =>
      addMutation('add', {
        bundle: e.type,
        values: {},
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.afterUuid,
      }),

    moveItem: (e) =>
      addMutation('move', {
        uuids: [e.item.uuid],
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.afterUuid,
      }),

    moveMultipleItems: (e) =>
      addMutation('move', {
        uuids: e.uuids,
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.afterUuid,
      }),

    deleteItem: (uuid) =>
      addMutation('delete', {
        uuids: [uuid],
      }),

    deleteMultipleItems: (uuids) =>
      addMutation('delete', {
        uuids,
      }),

    duplicateItems: (uuids) =>
      addMutation('duplicate', {
        uuids,
      }),

    undo() {
      editState.currentIndex = Math.max(editState.currentIndex - 1, -1)
      return mockResponse(editState.getMutatedState(getEntity()))
    },

    redo() {
      editState.currentIndex = Math.min(
        editState.currentIndex + 1,
        editState.getMutations().length,
      )
      return mockResponse(editState.getMutatedState(getEntity()))
    },

    setHistoryIndex(index: number) {
      editState.currentIndex = Math.min(
        Math.max(index, -1),
        editState.getMutations().length,
      )
      return mockResponse(editState.getMutatedState(getEntity()))
    },

    formFrameBuilder(e) {
      const prefix = `/blokkli-form/${ctx.value.entityType}/${ctx.value.entityUuid}`
      let url = ''
      const params = new URLSearchParams()
      if (e.id === 'block:add') {
        url = '/addBlock'
        params.set('bundle', e.data.type)
        params.set('hostEntityType', e.data.host.type)
        params.set('hostEntityUuid', e.data.host.uuid)
        params.set('hostField', e.data.host.fieldName)
        if (e.data.afterUuid) {
          params.set('preceedingUuid', e.data.afterUuid)
        }
      } else if (e.id === 'block:edit') {
        url = '/editBlock'
        params.set('uuid', e.data.uuid)
      }

      if (url) {
        return { url: `${prefix}${url}?${params.toString()}` }
      }
      return
    },

    updateOptions: (options) =>
      addMutation('update_options', {
        options,
      }),
  }

  return adapter
})
