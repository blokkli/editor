<template>
  <PluginToolbarButton
    id="notifications"
    ref="toolbarButton"
    :title="$t('notifications', 'Notifications')"
    :tour-text="
      $t(
        'notificationsTourText',
        'Shows notifications about mentions, resolved comments and other events.',
      )
    "
    :active="isVisible"
    :disabled="unreadCount === null"
    :weight="-100"
    region="before-sidebar"
    icon="bk_mdi_notifications"
    class="border-r border-r-mono-600 bk-has-dropdown"
    @click="isVisible = !isVisible"
  >
    <template #after>
      <BlokkliTransition name="context-menu">
        <ToolbarDropdown
          v-if="isVisible"
          :toggle-element
          class="origin-top-right"
          :title="$t('notifications', 'Notifications')"
          @close="isVisible = false"
        >
          <NotificationsList v-model:unread-count="unreadCount" />
        </ToolbarDropdown>
      </BlokkliTransition>
    </template>
    <template #icon-addon>
      <div
        v-if="unreadCount"
        class="bk-sidebar-badge bk-is-yellow"
        data-test="notifications-unread-badge"
      >
        {{ unreadCount }}
      </div>
    </template>
  </PluginToolbarButton>
</template>

<script lang="ts" setup>
import {
  ref,
  computed,
  useBlokkli,
  defineBlokkliFeature,
  useTemplateRef,
  onMounted,
  onUnmounted,
} from '#imports'
import { PluginToolbarButton } from '#blokkli/editor/plugins'
import { ToolbarDropdown, BlokkliTransition } from '#blokkli/editor/components'
import NotificationsList from './List/index.vue'

const { adapter } = defineBlokkliFeature({
  id: 'notifications',
  icon: 'bk_mdi_notifications',
  label: 'Notifications',
  requiredAdapterMethods: [
    'loadNotifications',
    'loadUnreadNotificationsCount',
    'markAllNotificationsAsRead',
  ],
  description:
    'Shows notifications for the current user (mentions, resolved comments, edit state events).',
})

const { $t, ui } = useBlokkli()

const ID = 'notifications'

const isVisible = computed({
  get() {
    return ui.openContextMenu.value === ID
  },
  set(isOpen) {
    if (isOpen) {
      ui.openContextMenu.value = ID
    } else {
      ui.openContextMenu.value = ''
    }
  },
})

const toolbarButton = useTemplateRef('toolbarButton')

const toggleElement = computed<HTMLElement | null>(
  () => toolbarButton.value?.el ?? null,
)

// `null` until the initial unread-count fetch resolves. While null the
// toolbar button is disabled. If the fetch fails the value stays null and
// the button remains disabled — silent on purpose (no toast for an init the
// user didn't trigger).
const unreadCount = ref<number | null>(null)

/** Poll interval for refreshing the unread-count badge. */
const POLL_INTERVAL_MS = 60_000

let lastFetchAt = 0

const fetchUnreadCount = async (): Promise<void> => {
  try {
    unreadCount.value = await adapter.loadUnreadNotificationsCount()
    lastFetchAt = Date.now()
  } catch {
    // Swallowed: poll failures keep the last known value. Initial failure
    // leaves the button disabled.
  }
}

/** Refresh only if the last fetch is older than the poll interval. */
const maybeRefresh = () => {
  if (isVisible.value || document.hidden) {
    return
  }
  if (Date.now() - lastFetchAt < POLL_INTERVAL_MS) {
    return
  }
  fetchUnreadCount()
}

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await fetchUnreadCount()
  // Poll periodically. The List owns the count while the dropdown is open
  // (it writes through `v-model:unread-count` after every interaction), so
  // we skip the tick to avoid a redundant request that could clobber the
  // List's fresher value with a stale one.
  pollInterval = setInterval(maybeRefresh, POLL_INTERVAL_MS)
  // Refresh on tab refocus too, but only when the last fetch is stale —
  // quick tab-flipping must not trigger a request storm.
  document.addEventListener('visibilitychange', maybeRefresh)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
  document.removeEventListener('visibilitychange', maybeRefresh)
})
</script>

<script lang="ts">
export default {
  name: 'Notifications',
}
</script>
