import type { ComputedRef } from 'vue'
import type {
  AddNewBlockEvent,
  MoveBlockEvent,
  MoveMultipleBlocksEvent,
} from '../events'
import type { PluginConfigInput } from '../types/pluginConfig'
import type { EntityTranslation, MappedState } from '../types/state'
import type { BlockBundleDefinition, FieldConfig } from '../types/definitions'
import type { EditBlockEvent } from '../features/edit/types'

export interface MutationResponseLike<T> {
  success: boolean
  state: T
  errors?: string[]
}

export type UpdateEntityFieldValueEvent = {
  fieldName: string
  fieldValue: string
}

type AdapterFormFrameBuilderResult = {
  url: string
}

type AdapterFormFrameBuilderBlockAdd = {
  id: 'block:add'
  data: AddNewBlockEvent
}

type AdapterFormFrameBuilderBlockTranslate = {
  id: 'block:translate'
  data: EditBlockEvent
  langcode: string
}

type AdapterFormFrameBuilderBlockEdit = {
  id: 'block:edit'
  data: EditBlockEvent
}

type AdapterFormFrameBuilderEntityEdit = {
  id: 'entity:edit'
}

type AdapterFormFrameBuilderEntityTranslate = {
  id: 'entity:translate'
  translation: EntityTranslation
}

type AdapterFormFrameBuilderBatchTranslate = {
  id: 'batchTranslate'
}

export type AdapterFormFrameBuilder =
  | AdapterFormFrameBuilderBlockAdd
  | AdapterFormFrameBuilderBlockEdit
  | AdapterFormFrameBuilderBlockTranslate
  | AdapterFormFrameBuilderEntityEdit
  | AdapterFormFrameBuilderEntityTranslate
  | AdapterFormFrameBuilderBatchTranslate

export interface AdapterContext {
  entityType: string
  entityUuid: string
  entityBundle: string
  language: string
}

export type BlokkliAdapterSearchResults<T> = {
  items: T[]
  total: number
  perPage: number
  filters: PluginConfigInput[]
}

export type AdapterSearchArguments = {
  page: number
  filters: Record<string, any>
}

export interface BlokkliAdapter<T> {
  /**
   * Load the state.
   */
  loadState(): Promise<T | undefined>

  /**
   * Load the unchanged state.
   */
  loadStateAtIndex?: (index: number) => Promise<T | undefined>

  /*
   * Map the state returned by mutations.
   */
  mapState(state: T): MappedState

  /**
   * Get disabled features at runtime.
   *
   * For example, the "Translation" feature can be disabled if the current
   * entity does not support translations.
   *
   * For features that are always disabled, use the `alterFeatures` option of
   * the module to remove them entirely.
   */
  getDisabledFeatures?: () => Promise<string[]>

  /**
   * Return a list of all types.
   */
  getAllBundles(): Promise<BlockBundleDefinition[]>

  /**
   * Get the field configurations.
   */
  getFieldConfig(): Promise<FieldConfig[]>

  /**
   * Add a new block.
   */
  addNewBlock(e: AddNewBlockEvent): Promise<MutationResponseLike<T>>

  /**
   * Move an item.
   */
  moveBlock(e: MoveBlockEvent): Promise<MutationResponseLike<T>>

  /**
   * Move multiple items.
   */
  moveMultipleBlocks(
    e: MoveMultipleBlocksEvent,
  ): Promise<MutationResponseLike<T>>

  /**
   * Get the last changed timestamp for the edit state.
   */
  getLastChanged?: () => Promise<number>

  /**
   * Build the URL for forms.
   */
  formFrameBuilder?: (
    e: AdapterFormFrameBuilder,
  ) => AdapterFormFrameBuilderResult | undefined

  userSettings?: {
    /**
     * Load user settings.
     */
    load: () => Promise<string | Record<string, any>>

    /**
     * Persist user settings.
     */
    persist: (settings: string) => Promise<undefined>
  }
}

export type BlokkliAdapterFactory<T> = (
  ctx: ComputedRef<AdapterContext>,
) => Promise<BlokkliAdapter<T>> | BlokkliAdapter<T>

export type AdapterMethods = keyof BlokkliAdapter<any>

export function defineBlokkliEditAdapter<T>(
  cb: BlokkliAdapterFactory<T>,
): BlokkliAdapterFactory<T> {
  return cb
}
