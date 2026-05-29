<template>
  <li class="border-b border-b-mono-300 last:border-b-0">
    <component
      :is="href ? 'a' : 'div'"
      :href="href || undefined"
      :target="href ? '_blank' : undefined"
      :rel="href ? 'noopener' : undefined"
      class="bk-notification-item px-10 py-15 hover:border-mono-300 flex gap-8 group"
      :class="{
        'hover:bg-mono-100': href,
      }"
      :data-test="'notification-' + uuid"
    >
      <div
        class="bk-notification-icon shrink-0 size-20 rounded-full flex items-center justify-center"
        :class="{
          'bg-mono-200 text-mono-500': read,
          'text-yellow-dark! bg-yellow-normal': !read,
        }"
      >
        <Icon :name="icon" class="size-15" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="text-sm text-mono-900 font-semibold leading-tight">
          {{ title }}
        </div>
        <div class="text-xs text-mono-600 flex items-center gap-5 min-w-0 mt-3">
          <div class="shrink-0 font-semibold">
            <RelativeTime :timestamp="created" />
          </div>
          <template v-if="host">
            <span class="truncate">{{ host.label }}</span>
          </template>
        </div>
        <div v-if="message" class="text-sm mt-10">
          {{ message }}
        </div>
      </div>
    </component>
  </li>
</template>

<script lang="ts" setup>
import { computed } from '#imports'
import { Icon, RelativeTime } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { BlokkliNotification, BlokkliNotificationType } from '../types'

const props = defineProps<BlokkliNotification>()

const ICONS: Record<BlokkliNotificationType, BlokkliIcon> = {
  'comment:mention': 'bk_mdi_alternate_email',
  'comment:resolved': 'bk_mdi_check_circle',
  'edit-state:approved': 'bk_mdi_verified',
}

const icon = computed(() => ICONS[props.type])

/**
 * Type-specific query parameters appended to the deep link. The notification
 * type owns the mapping to the query parameter the target feature reads
 * (e.g. comments reads `blokkliComment`).
 */
function extraQuery(): Record<string, string> {
  if (!props.relatedEntityUuid) {
    return {}
  }
  switch (props.type) {
    case 'comment:mention':
    case 'comment:resolved':
      return { blokkliComment: props.relatedEntityUuid }
    case 'edit-state:approved':
      return {}
  }
}

/**
 * Build the deep-link URL for this notification, or `null` when it is not
 * deep-linkable (no host — e.g. the host was deleted). Appends the universal
 * `blokkliEditing` param plus any type-specific params. Returns a same-origin
 * relative path when possible, or the full URL for cross-origin hosts.
 */
const href = computed(() => {
  if (!props.host) {
    return null
  }
  const url = new URL(props.host.url, window.location.origin)
  url.searchParams.set('blokkliEditing', props.host.uuid)
  for (const [key, value] of Object.entries(extraQuery())) {
    url.searchParams.set(key, value)
  }
  return url.origin === window.location.origin
    ? url.pathname + url.search + url.hash
    : url.toString()
})
</script>

<script lang="ts">
export default {
  name: 'NotificationItem',
}
</script>
