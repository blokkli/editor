import type { MutationResponseLike } from '#blokkli/editor/adapter'
import type { FieldListItem } from '#blokkli/types'
import type { PublishOptions } from '../features/publish/types'

export type MutatedField = {
  name: string
  entityType: string
  entityUuid: string
  list: FieldListItem[]
}

export type EditEntity = {
  label?: string
  status?: boolean
  bundleLabel?: string
}

export interface Language {
  id: string
  name: string
}

export interface EntityTranslation {
  id: string
  url: string
  editUrl?: string
  exists: boolean
  status: boolean
}

export interface TranslationState {
  isTranslatable?: boolean | null
  sourceLanguage?: string | null
  availableLanguages?: Language[]
  translations?: EntityTranslation[]
}

export interface MutationItem {
  timestamp?: string
  pluginId?: string
  plugin?: { label?: string; affectedItemUuid?: string }
  enabled?: boolean
}

export interface Validation {
  message: string
  code?: string
  propertyPath?: string
  entityType?: string
  entityUuid?: string
}

export interface MappedState {
  currentIndex: number
  mutations: MutationItem[]
  currentUserIsOwner: boolean
  ownerName: string
  mutatedState?: {
    mutatedOptions?: any
    mutatedHostOptions?: Record<string, string>
    fields?: MutatedField[]
    violations?: Validation[]
  }
  publishOptions: PublishOptions
  entity: EditEntity
  mutatedEntity?: any
  translationState: TranslationState
  previewUrl?: string
}

export type MutateWithLoadingStateFunction = (
  promise: () => Promise<MutationResponseLike<any>> | undefined,
  errorMessage?: string | false,
  successMessage?: string,
) => Promise<boolean>

export type MutatedOptions = {
  [uuid: string]: {
    [key: string]: string
  }
}

export type MutatedItemProps = {
  [uuid: string]:
    | {
        [key: string]: string
      }
    | undefined
}

export type EditMode = 'readonly' | 'editing' | 'translating' | 'review'
