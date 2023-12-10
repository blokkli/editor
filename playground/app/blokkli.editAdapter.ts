import { defineBlokkliEditAdapter } from '#blokkli/adapter'
import type { BlokkliAdapter } from '#blokkli/adapter'
import { allTypes } from './mock/allTypes'
import { availableTypes } from './mock/availableTypes'
import { conversions } from './mock/conversions'
import { state, createPage, editState } from './mock/state'
import type { MutatedState } from './mock/state/EditState'
import { transforms } from './mock/transforms'

export default defineBlokkliEditAdapter((providedContext) => {
  const addMutation = (id: string, args: any) => {
    editState.addMutation(id, args)
    const entity = createPage()
    editState.getMutatedState(entity)
  }

  const adapter: BlokkliAdapter<MutatedState> = {
    loadState() {
      return Promise.resolve(state)
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
      const page = createPage()
      const mutatedState = inputState.editState.getMutatedState(page)
      return {
        currentIndex: inputState.editState.currentIndex,
        mutations: inputState.editState.getMutationItems(),
        currentUserIsOwner: true,
        ownerName: inputState.owner.name,
        mutatedState: {
          mutatedOptions: mutatedState.mutatedOptions,
          fields: mutatedState.mutatedFields,
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
    loadComments() {
      return Promise.resolve([])
    },
    addNewBlokkliItem(e) {},

    moveItem(e) {
      addMutation('move', {
        uuids: [e.item.uuid],
        hostEntityType: e.host.type,
        hostEntityUuid: e.host.uuid,
        hostField: e.host.fieldName,
        preceedingUuid: e.afterUuid,
      })
    },
  }

  return adapter
})
