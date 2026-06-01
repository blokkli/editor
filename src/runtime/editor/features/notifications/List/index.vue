<template>
  <ScrollBoundary
    class="w-[400px] overflow-auto bk-scrollbar-light max-h-[600px]"
  >
    <TransitionHeight>
      <div
        v-if="unreadCount"
        class="flex items-center justify-end px-15 py-10 border-b border-b-mono-300"
      >
        <button
          class="bk-notifications-mark-all flex items-center gap-5 text-sm text-mono-700 hover:text-accent-700"
          data-test="notifications-mark-all-read"
          @click.stop="onMarkAllRead"
        >
          <Icon name="bk_mdi_done_all" class="size-15" />
          <span>{{ $t('notificationsMarkAllRead', 'Mark all as read') }}</span>
        </button>
      </div>
    </TransitionHeight>

    <ul v-if="notifications.length" class="select-text">
      <NotificationItem
        v-for="notification in notifications"
        :key="notification.uuid"
        v-bind="notification"
      />
    </ul>
    <div
      v-else
      class="flex-1 flex items-center justify-center p-30 text-center text-sm text-mono-500"
    >
      {{ $t('notificationsEmpty', 'No notifications.') }}
    </div>

    <div
      v-if="hasMore"
      class="sticky bottom-0 z-50 bg-linear-0 from-white to-white/0 via-65% via-white"
    >
      <button
        class="w-full py-15 text-sm text-mono-700 hover:text-accent-700 disabled:opacity-40 disabled:cursor-default text-center font-semibold"
        :disabled="isLoadingMore"
        data-test="notifications-load-more"
        @click.stop="onLoadMore"
      >
        {{ $t('notificationsLoadMore', 'Load more') }}
      </button>
    </div>
  </ScrollBoundary>
</template>

<script lang="ts" setup>
import { computed, ref, useBlokkli } from '#imports'
import {
  Icon,
  ScrollBoundary,
  TransitionHeight,
} from '#blokkli/editor/components'
import { emitMessage } from '#blokkli/editor/events'
import NotificationItem from '../Item/index.vue'
import type { BlokkliNotification } from '../types'

const { $t, adapter } = useBlokkli()

const unreadCount = defineModel<number | null>('unreadCount', {
  required: true,
})

const notifications = ref<BlokkliNotification[]>([])
const nextCursor = ref<string | null>(null)
const isLoadingMore = ref(false)

const hasMore = computed(() => nextCursor.value !== null)

const reportError = (additional: unknown) =>
  emitMessage(
    $t('notificationsLoadError', 'Failed to load notifications.'),
    'error',
    additional,
  )

try {
  const initial = await adapter.loadNotifications!({ markAsRead: true })
  notifications.value = initial.items
  nextCursor.value = initial.nextCursor
  unreadCount.value = initial.unreadCount
} catch (err) {
  reportError(err)
  // The dropdown can't render without data — close it. The badge state on
  // the toolbar is preserved from the parent's earlier fetch.
  // @TODO: Render error.
}

const onLoadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) {
    return
  }
  isLoadingMore.value = true
  try {
    const next = await adapter.loadNotifications!({
      after: nextCursor.value ?? undefined,
      markAsRead: true,
    })
    // Dedupe by uuid in case a notification we already have was returned
    // again (e.g. backend shifted under us between fetches).
    const seen = new Set(notifications.value.map((n) => n.uuid))
    notifications.value = [
      ...notifications.value,
      ...next.items.filter((n) => !seen.has(n.uuid)),
    ]
    nextCursor.value = next.nextCursor
    unreadCount.value = next.unreadCount
  } catch (err) {
    reportError(err)
  } finally {
    isLoadingMore.value = false
  }
}

const onMarkAllRead = async () => {
  try {
    unreadCount.value = await adapter.markAllNotificationsAsRead!()
    notifications.value = notifications.value.map((n) => ({
      ...n,
      read: true,
    }))
  } catch (err) {
    emitMessage(
      $t(
        'notificationsMarkAllReadError',
        'Failed to mark notifications as read.',
      ),
      'error',
      err,
    )
  }
}
</script>

<script lang="ts">
export default {
  name: 'NotificationsList',
}
</script>
