/**
 * In-memory notification store for the playground.
 *
 * Intentionally NOT persisted: a full page reload re-seeds the defaults, which
 * restores the unread notifications — convenient for development.
 */

import type { BlokkliNotificationType } from '#blokkli/editor/features/notifications/types'

export interface StoredNotification {
  uuid: string
  read: boolean
  /** Milliseconds since epoch. */
  created: number
  type: BlokkliNotificationType
  title: string
  message?: string
  /** User id of the user that triggered the event. */
  user?: string
  /** UUID of the related entity (e.g. a comment), depending on `type`. */
  relatedEntityUuid?: string
  /**
   * Host entity (page) the notification points at. Omitted when the host was
   * deleted or the notification has no host at all.
   */
  host?: {
    entityType: string
    entityUuid: string
  }
}

/**
 * Get default notifications that should be initialized if none exist.
 *
 * Seeds notifications for the current user (id `1`, John Miller) referencing the
 * existing seed comments so deep links are demonstrable.
 */
function getDefaultNotifications(): StoredNotification[] {
  const now = Date.now()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  const t = (offset: number): number => now - offset

  const base: StoredNotification[] = [
    {
      uuid: 'notif-1',
      read: false,
      created: t(12 * minute),
      type: 'comment:mention',
      title: 'Sarah Chen mentioned you in a comment',
      message: 'sollten wir diesen Abschnitt umformulieren?',
      user: '3',
      relatedEntityUuid: 'seed-1-root',
      host: { entityType: 'content', entityUuid: '1' },
    },
    {
      uuid: 'notif-2',
      read: false,
      created: t(2 * hour),
      type: 'comment:resolved',
      title: 'Lukas Müller resolved your comment',
      user: '5',
      relatedEntityUuid: 'seed-5-root',
      host: { entityType: 'content', entityUuid: '1' },
    },
    {
      uuid: 'notif-3',
      read: false,
      created: t(5 * hour),
      type: 'edit-state:approved',
      title: 'Martin Faux approved your changes',
      user: '2',
      host: { entityType: 'content', entityUuid: '1' },
    },
    {
      uuid: 'notif-hostless',
      read: false,
      created: t(8 * hour),
      type: 'edit-state:approved',
      title: 'A page you edited was deleted',
      message: 'The host entity no longer exists, so this is not linkable.',
      user: '2',
    },
    {
      uuid: 'notif-4',
      read: true,
      created: t(1 * day),
      type: 'comment:mention',
      title: 'Aisha Patel mentioned you in a comment',
      user: '4',
      relatedEntityUuid: 'seed-4-root',
      host: { entityType: 'content', entityUuid: '1' },
    },
    {
      uuid: 'notif-5',
      read: true,
      created: t(3 * day),
      type: 'comment:mention',
      title: 'Diego Ramírez mentioned you in a comment',
      user: '6',
      relatedEntityUuid: 'seed-3-root',
      host: { entityType: 'content', entityUuid: '1' },
    },
  ]

  // Extra notifications so the list is long enough to test overflow scrolling
  // in the dropdown.
  const authors = ['3', '5', '2', '4', '6']
  const commentTargets = [
    'seed-1-root',
    'seed-3-root',
    'seed-4-root',
    'seed-5-root',
  ]
  const extras: StoredNotification[] = Array.from(
    { length: 20 },
    (_, i): StoredNotification => {
      const user = authors[i % authors.length]
      const relatedEntityUuid = commentTargets[i % commentTargets.length]
      const created = t(2 * day + i * 3 * hour)
      const variant = i % 3
      if (variant === 0) {
        return {
          uuid: `notif-gen-${i}`,
          read: i % 2 === 0,
          created,
          type: 'comment:mention',
          title: `Mention #${i + 1} in a comment`,
          message: 'Please take a look when you have a moment.',
          user,
          relatedEntityUuid,
          host: { entityType: 'content', entityUuid: '1' },
        }
      }
      if (variant === 1) {
        return {
          uuid: `notif-gen-${i}`,
          read: i % 2 === 0,
          created,
          type: 'comment:resolved',
          title: `Resolved comment #${i + 1}`,
          user,
          relatedEntityUuid,
          host: { entityType: 'content', entityUuid: '1' },
        }
      }
      return {
        uuid: `notif-gen-${i}`,
        read: i % 2 === 0,
        created,
        type: 'edit-state:approved',
        title: `Changes approved #${i + 1}`,
        user,
        host: { entityType: 'content', entityUuid: '1' },
      }
    },
  )

  return [...base, ...extras]
}

/**
 * In-memory notification list. Seeded once per page load; a full reload resets
 * it back to the unread defaults.
 */
const notifications: StoredNotification[] = getDefaultNotifications()

/**
 * Load all notifications.
 */
export function loadNotifications(): StoredNotification[] {
  return notifications
}

/**
 * Get the number of unread notifications.
 */
export function getUnreadCount(): number {
  return notifications.filter((notification) => !notification.read).length
}

/**
 * Mark the given notifications as read.
 */
export function markAsRead(uuids: string[]): void {
  notifications.forEach((notification) => {
    if (uuids.includes(notification.uuid)) {
      notification.read = true
    }
  })
}

/**
 * Mark all notifications as read.
 */
export function markAllAsRead(): void {
  notifications.forEach((notification) => {
    notification.read = true
  })
}
