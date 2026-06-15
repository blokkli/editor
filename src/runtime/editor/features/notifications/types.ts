import type { BlokkliUser } from '#blokkli/editor/types/user'

/**
 * The complete set of notification types the frontend can render. Used as
 * a runtime allow-list at the adapter boundary — backend payloads with a
 * `type` outside this list are coerced to `'generic'` (and a warning is
 * logged) rather than fed through an `as` cast that would silently lie
 * about being a known type.
 *
 * Follows a `<feature>:<event>` convention. Add new entries here as new
 * notification sources are added (e.g. `'edit-state:rejected'`).
 *
 * `'generic'` is the fallback for unknown types: rendered with a neutral
 * icon, deep-linked to its host (no type-specific query parameters).
 */
export const BLOKKLI_NOTIFICATION_TYPES = [
  'comment:mention',
  'comment:resolved',
  'comment:reply',
  'comment:thread',
  'edit-state:approved',
  'generic',
] as const

export type BlokkliNotificationType =
  (typeof BLOKKLI_NOTIFICATION_TYPES)[number]

/**
 * Type guard for raw backend `type` strings.
 */
export function isBlokkliNotificationType(
  value: string,
): value is BlokkliNotificationType {
  return (BLOKKLI_NOTIFICATION_TYPES as readonly string[]).includes(value)
}

/**
 * Coerce a raw backend `type` string into a known `BlokkliNotificationType`.
 * Falls back to `'generic'` (with a warning) for unknown values — use this
 * at the adapter boundary instead of `as`-casting.
 */
export function toValidNotificationType(
  value: string,
): BlokkliNotificationType {
  if (isBlokkliNotificationType(value)) {
    return value
  }
  console.warn(
    `[blokkli] Unknown notification type "${value}", rendering as generic`,
  )
  return 'generic'
}

/**
 * The host entity (page) a notification relates to.
 */
export type BlokkliNotificationHost = {
  uuid: string
  entityType: string
  entityBundle: string
  /**
   * Human readable label of the host entity (e.g. the page title).
   */
  label: string
  /**
   * URL/path of the host entity (page).
   */
  url: string
}

export type BlokkliNotification = {
  uuid: string

  /**
   * Whether the user has read this notification.
   */
  read: boolean

  /**
   * ISO 8601 timestamp (e.g. `2026-05-28T14:32:18Z`).
   */
  created: string

  /**
   * What kind of event this notification represents.
   */
  type: BlokkliNotificationType

  /**
   * The main, human readable text (plain).
   */
  title: string

  /**
   * Optional secondary line (plain).
   */
  message?: string

  /**
   * The user that triggered the event (mention author, resolver, ...), or
   * `null` when there is no associated user or the account was deleted.
   */
  user?: BlokkliUser | null

  /**
   * UUID of the entity this notification points at. Its meaning depends on
   * `type` (e.g. a comment UUID for `comment:*` notifications). Used by the
   * feature to build the deep link.
   */
  relatedEntityUuid?: string

  /**
   * The host entity (page) the notification lives on, or `null` when the host
   * was deleted or the notification has no host at all (e.g. a system-wide
   * event). When present, the feature builds the deep link as
   * `${host.url}?blokkliEditing=${host.uuid}` plus any type-specific query
   * parameters. When `null`, the notification is not deep-linkable.
   */
  host: BlokkliNotificationHost | null
}

/**
 * A single page of notifications.
 */
export type BlokkliNotificationList = {
  /** The notifications for the requested page (newest first). */
  items: BlokkliNotification[]
  /**
   * Opaque cursor for the next (older) page, or `null` when there are no
   * more. Pass it back as `after` to fetch the next page.
   */
  nextCursor: string | null
  /**
   * The total number of unread notifications for the current user after
   * this request was processed (reflects any `markAsRead` side-effect).
   */
  unreadCount: number
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Load a single page of notifications for the current user (newest first).
     */
    loadNotifications?: (options: {
      /**
       * Opaque cursor returned by a previous call, or `undefined` for the
       * first page.
       */
      after?: string
      /**
       * When `true`, mark the returned notifications as read as part of the
       * same request. The response `unreadCount` then reflects the count
       * after this side-effect.
       */
      markAsRead: boolean
    }) => Promise<BlokkliNotificationList>

    /**
     * Load the number of unread notifications for the current user, without
     * loading the notifications themselves.
     */
    loadUnreadNotificationsCount?: () => Promise<number>

    /**
     * Mark all of the current user's notifications as read (including ones
     * not yet loaded) and return the new total unread count (always `0`).
     * Backs the "Mark all as read" button.
     */
    markAllNotificationsAsRead?: () => Promise<number>
  }
}
