import { WritableComputedRef } from 'nuxt/dist/app/compat/capi'
import {
  DraggableExistingParagraphItem,
  MutatedParagraphOptions,
} from '../components/Edit/types'
import { eventBus } from './../components/Edit/eventBus'
import { PbAdapter } from './adapter'

export type PbMutateWithLoadingState = (
  promise: Promise<PbMutationResponseLike<any>> | undefined,
  errorMessage?: string,
  successMessage?: string,
) => Promise<boolean>

export type PbAvailableFeatures = {
  comment: boolean
  conversion: boolean
  duplicate: boolean
  library: boolean
}

export interface PbStore {
  /**
   * Perform a mutation with a loading state.
   */
  mutateWithLoadingState: PbMutateWithLoadingState

  /**
   * The adapter.
   */
  adapter: PbAdapter<any>

  /**
   * The entity type.
   */
  entityType: string
  entityUuid: string
  entityBundle: string
  canEdit: globalThis.ComputedRef<boolean>
  currentMutationIndex: globalThis.Ref<Readonly<number>>
  setMutationIndex: (index: number) => void

  availableFeatures: globalThis.Ref<Readonly<PbAvailableFeatures>>

  mutations: globalThis.Ref<Readonly<PbMutation[]>>

  activeSidebar: globalThis.Ref<Readonly<string>>
  toggleSidebar: (id: string) => void
  showSidebar: (id: string) => void
  allTypes: globalThis.ComputedRef<PbType[]>
  violations: globalThis.Ref<Readonly<PbViolation[]>>
  eventBus: typeof eventBus

  selectedParagraphs: globalThis.ComputedRef<DraggableExistingParagraphItem[]>

  allowedTypes: globalThis.ComputedRef<PbAllowedBundle[]>
  allowedTypesInList: globalThis.ComputedRef<string[]>
  paragraphTypesWithNested: globalThis.ComputedRef<string[]>

  runtimeConfig: {
    disableLibrary: boolean
    gridMarkup: string
    langcodeWithoutPrefix: string
  }

  activeFieldKey: globalThis.Ref<Readonly<string>>
  setActiveFieldKey: (key: string) => void

  isPressingControl: globalThis.Ref<Readonly<boolean>>
  isPressingSpace: globalThis.Ref<Readonly<boolean>>
  previewGrantUrl: globalThis.Ref<Readonly<string>>
  entity: globalThis.Readonly<globalThis.Ref<globalThis.Readonly<PbEditEntity>>>
  translationState: Readonly<globalThis.Ref<Readonly<PbTranslationState>>>

  currentLanguage: WritableComputedRef<string | null | undefined>

  editMode: globalThis.Ref<Readonly<PbEditMode>>

  mutatedFields: globalThis.Ref<Readonly<PbMutatedField[]>>

  mutatedOptions: globalThis.Ref<MutatedParagraphOptions>

  ownerName: globalThis.Ref<Readonly<string>>
  currentUserIsOwner: globalThis.Ref<Readonly<boolean>>
  takeOwnership: () => void

  conversions: globalThis.ComputedRef<PbConversion[]>

  isDragging: globalThis.Ref<Readonly<boolean>>

  settings: globalThis.Ref<Record<string, any>>

  refreshKey: globalThis.Ref<Readonly<string>>
}

export type StringBoolean = '0' | '1'

export type ParagraphDefinitionOptionText = {
  type: 'text'
  default: string
  label: string
  inputType?: 'text' | 'number' | 'date'
}

export type ParagraphDefinitionOptionCheckbox = {
  type: 'checkbox'
  default: StringBoolean
  label: string
}

export type ParagraphDefinitionOptionCheckboxes = {
  type: 'checkboxes'
  label: string
  options: Record<string, string>
}

export type ParagraphDefinitionOptionRadios = {
  type: 'radios'
  label: string
  default: string
  displayAs?: 'radios' | 'colors' | 'grid'
  options: Record<string, string | number[]>
}

export type ParagraphDefinitionOption =
  | ParagraphDefinitionOptionCheckbox
  | ParagraphDefinitionOptionCheckboxes
  | ParagraphDefinitionOptionRadios
  | ParagraphDefinitionOptionText

export type ParagraphDefinitionOptionsInput = {
  [key: string]: ParagraphDefinitionOption
}

export type ParagraphDefinitionInput<V, T = []> = {
  /**
   * The Drupal bundle name of the paragraph, e.g. "text" or "section_title".
   */
  bundle: string

  /**
   * The name of the chunk group to put the paragraph in.
   *
   * If this value is set, the paragraph component will be assigned to this
   * import chunk. Multiple paragraphs can have the same chunk name.
   *
   * See the `chunkNames` option on the module's configuration for more details.
   */
  chunkName?: V

  /**
   * Options available for the paragraph.
   *
   * These options are specific to this paragraph.
   */
  options?: ParagraphDefinitionOptionsInput

  /**
   * Global options to use for this paragraph.
   *
   * These options will be merged with the paragraph-specific options.
   */
  globalOptions?: T

  /**
   * Disable editing of the paragraph. This should be set if the paragraph
   * doesn't have any fields that can be edited in Drupal, except for paragraph
   * fields.
   */
  disableEdit?: boolean

  /**
   * If set, this width is used during editing when a skeleton of the
   * paragraph is being displayed. Additionally, the width is used in the
   * library pane to properly scale the element in the limited amount of space.
   */
  editWidth?: number

  /**
   * A background color class that is applied during editing when the paragraph
   * is being displayed standalone.
   */
  editBackgroundClass?: string
}

export type InjectedParagraphItem = ComputedRef<{
  index: ComputedRef<number>
  uuid: string
  paragraphsBuilderOptions: Record<string, string> | undefined
  isEditing: boolean
  parentParagraphBundle?: string
}>

export interface PbFieldItemParagraphFragment {
  __typename: any
  id?: string
  uuid: string
  entityBundle: string
}

export interface PbFieldItemFragment<T extends any> {
  item?: PbFieldItemParagraphFragment
  paragraph?: T
}

type PbList = PbFieldItemFragment<any>[]

export type PbMutatedField = {
  name: string
  label: string
  field: {
    list?: PbFieldItemFragment<any>[]
  }
}

export type PbEditEntityTranslation = {
  langcode: string
  url: string
  status: boolean
}

export type PbEditEntity = {
  id?: string
  label?: string
  changed?: number
  status?: boolean
  translations: PbEditEntityTranslation[]
  bundleLabel?: string
  editUrl?: string
}

export interface PbAvailableLanguage {
  id?: string
  name: string
}

export interface PbTranslationState {
  isTranslatable?: boolean | null
  sourceLanguage?: string | null
  availableLanguages?: PbAvailableLanguage[]
  translations?: Array<string | null> | null
}

export interface PbFieldConfig {
  name?: string
  label?: string
  storage?: {
    cardinality?: number
  }
}

export interface PbFieldEntity {
  id?: string
  entityTypeId: string
  entityBundle: string
  uuid: string
}

export interface PbConversion {
  sourceBundle: string
  targetBundle: string
}

export interface PbField {
  canEdit?: boolean
  list?: PbList
  fieldConfig?: PbFieldConfig
  entity?: PbFieldEntity
}

export interface PbLibraryItem {
  uuid: string
  label?: string
  bundle: string
  item: PbFieldItemParagraphFragment
  paragraph: any
}

export interface PbAllowedBundle {
  entityType: string
  bundle: string
  fieldName: string
  allowedTypes?: string[]
}

export interface PbImportItem {
  uuid: string
  label: string
}

export type PbComment = {
  uuid?: string
  targetUuid?: string
  resolved?: boolean
  body?: string
  created?: { first?: { value?: string } }
  user?: { label?: string }
}

export interface PbMutation {
  timestamp?: string
  pluginId?: string
  plugin?: { label?: string; affectedParagraphUuid?: string }
}

export interface PbViolation {
  message: string
  code?: string
  propertyPath?: string
}

export interface PbEditState {
  currentIndex: number
  mutations: PbMutation[]
  currentUserIsOwner: boolean
  ownerName: string
  mutatedState?: {
    behaviorSettings?: any
    fields?: PbMutatedField[]
    violations?: PbViolation[]
  }
  entity: PbEditEntity
  translationState: PbTranslationState
  previewUrl?: string
}

export interface PbType {
  id?: string
  label?: string
  description?: string
  allowReusable?: boolean
  icon?: string
  isTranslatable?: boolean
}

interface PbMutationResponseLike<T> {
  data: {
    state?: {
      action?: {
        success?: boolean
        state?: T
      }
    }
  }
}

export type PbEditMode = 'readonly' | 'editing' | 'translating'

export interface PbSettings {
  showImport: boolean | undefined
  persistCanvas: boolean | undefined
}

export default {}
