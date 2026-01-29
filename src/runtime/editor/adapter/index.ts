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
import type { UserPermissions } from '../types/permissions'

export interface MutationResponseLike<T> {
  success: boolean
  state?: T
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

  getUserPermissions: () => Promise<UserPermissions[]>

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

/**
 * Methods that adapter extensions can implement.
 * Features augment this interface via module augmentation to add extensible methods.
 * These methods can be implemented by both the base adapter AND extensions.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
export interface AdapterExtensionMethods<T> {
  // Features augment this interface to declare extensible methods
}

/**
 * The full adapter type combining core methods with extensible methods.
 */
export type FullBlokkliAdapter<T> = BlokkliAdapter<T> &
  Partial<AdapterExtensionMethods<T>>

export type BlokkliAdapterFactory<T> = (
  ctx: ComputedRef<AdapterContext>,
) => Promise<FullBlokkliAdapter<T>> | FullBlokkliAdapter<T>

export type AdapterMethods =
  | keyof BlokkliAdapter<any>
  | keyof AdapterExtensionMethods<any>

export function defineBlokkliEditAdapter<T>(
  cb: BlokkliAdapterFactory<T>,
): BlokkliAdapterFactory<T> {
  return cb
}

/**
 * An adapter extension (with namespace assigned by build system).
 */
export interface BlokkliAdapterExtension<T = any> {
  /**
   * Unique namespace (e.g., '@my-org/ai').
   * Assigned by the build system from registerAdapterExtension().
   */
  namespace: string

  /**
   * Extension methods.
   */
  methods: Partial<AdapterExtensionMethods<T>>
}

/**
 * Factory type for extension files.
 * Just returns methods - namespace is assigned externally.
 */
export type BlokkliAdapterExtensionFactory<T> = (
  ctx: ComputedRef<AdapterContext>,
) =>
  | Promise<Partial<AdapterExtensionMethods<T>>>
  | Partial<AdapterExtensionMethods<T>>

/**
 * Define an adapter extension.
 * The namespace is NOT specified here - it's assigned via registerAdapterExtension().
 */
export function defineBlokkliAdapterExtension<T>(
  factory: BlokkliAdapterExtensionFactory<T>,
): BlokkliAdapterExtensionFactory<T> {
  return factory
}
