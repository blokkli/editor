import type { BlokkliAdapterSearchResults } from '#blokkli/editor/adapter'
import type { EditEntity } from '#blokkli/editor/types/state'

export type PublishOptions = {
  canPublish: boolean
  isRevisionable: boolean
  hasRevisionLogMessage: boolean
  lastChanged: string | null
  canSchedule: boolean
  publishOn: string | null
  revisionLogMessage: string | null
}

export type BlokkliAdapterPublishOptions = {
  /**
   * The host entity type.
   */
  hostEntityType: string

  /**
   * The host entity UUID.
   */
  hostEntityUuid: string

  /**
   * Whether the editor will be closed after publishing.
   *
   * If false, the adapter should return an empty state again, so that the
   * editor UI shows the correct state (no pending changes).
   * If true, the adapter may return no state at all, since the editor will
   * be closed anyway after publishing.
   */
  closeAfterPublish?: boolean

  /**
   * If the host entity is currently unpublished, publish it.
   */
  publishIfUnpublished?: boolean

  /**
   * The revision log message.
   */
  revisionLogMessage?: string
}

export type BlokkliAdapterScheduleOptions = {
  /**
   * The host entity type.
   */
  hostEntityType: string

  /**
   * The host entity UUID.
   */
  hostEntityUuid: string

  /**
   * The revision log message.
   */
  revisionLogMessage?: string

  /**
   * The date and time when the edit state should be published.
   */
  date: string
}

export type BlokkliAdapterUnscheduleOptions = {
  /**
   * The host entity type.
   */
  hostEntityType: string

  /**
   * The host entity UUID.
   */
  hostEntityUuid: string
}

export type GetEditStatesItem = {
  hostEntityType: string
  hostEntityUuid: string
  entity: EditEntity
  currentUserIsOwner: boolean
  lastChanged: string
  pendingChanges: number
  ownerName: string
  url: string
}

export type BlokkliAdapterGetEditStatesResult =
  BlokkliAdapterSearchResults<GetEditStatesItem>

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Get the publish options.
     */
    getPublishOptions?: () => Promise<PublishOptions>

    /**
     * Publish all changes.
     */
    publish?: (
      options: BlokkliAdapterPublishOptions,
    ) => Promise<MutationResponseLike<T | undefined | null>>

    /**
     * Schedule an edit state.
     */
    scheduleEditState?: (
      options: BlokkliAdapterScheduleOptions,
    ) => Promise<MutationResponseLike<T | undefined | null>>

    /**
     * Unschedule an already scheduled edit state.
     */
    unscheduleEditState?: (
      options: BlokkliAdapterUnscheduleOptions,
    ) => Promise<MutationResponseLike<T | undefined | null>>

    /**
     * Search for edit states.
     */
    getEditStates?: (
      e?: AdapterSearchArguments,
    ) => Promise<BlokkliAdapterGetEditStatesResult>
  }
}

declare module '#blokkli/editor/events' {
  interface EventbusEvents {
    /**
     * Emitted when publishing failed.
     */
    'publish:failed': undefined

    /**
     * Show the publish dialog.
     */
    'publish:show-dialog': undefined
  }
}
