import { ParagraphsBuilderEditStateFragment } from '#build/graphql-operations'
import { falsy } from '../../components/Edit/helpers'
import { PbEditState } from '../../types'

interface PbAdapter<T> {
  mapState(state: T): PbEditState
}

const drupalAdapter: PbAdapter<
  ParagraphsBuilderEditStateFragment | undefined | null
> = {
  mapState(state) {
    const currentIndex =
      state?.currentIndex === null || state?.currentIndex === undefined
        ? -1
        : state.currentIndex
    const mutations = state?.mutations || []
    const currentUserIsOwner = !!state?.currentUserIsOwner
    const ownerName = state?.ownerName || ''
    const mutatedState = state?.mutatedState || {}
    const entity = state?.entity
    const translationState = state?.translationState || {}
    const previewUrl = state?.previewUrl || ''

    const entityTranslations =
      entity && 'translations' in entity
        ? entity.translations
            ?.map((v) => {
              if (v.langcode && 'url' in v && v.url?.path) {
                return {
                  langcode: v.langcode,
                  url: v.url.path,
                  status: 'status' in v ? !!v.status : true,
                }
              }
              return null
            })
            .filter(falsy) || []
        : []

    const bundleLabel = state?.bundleLabel || ''

    const editUrl =
      state?.entity && 'editUrl' in state.entity
        ? state.entity.editUrl?.path
        : ''

    return {
      currentIndex,
      mutations,
      currentUserIsOwner,
      ownerName,
      mutatedState,
      entity: {
        ...(entity || {}),
        translations: entityTranslations,
        bundleLabel,
        editUrl,
      },
      translationState,
      entityTranslations,
      previewUrl,
    }
  },
}

export default drupalAdapter
