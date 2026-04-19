<template>
  <a
    :href="url"
    class="bk-command flex items-center gap-10 px-15 w-full text-left no-underline max-w-full min-w-0 border border-transparent"
    :class="
      focused ? 'bg-mono-800 border-mono-100 text-white' : 'text-mono-300'
    "
  >
    <div class="flex-1 min-w-0">
      <div class="truncate font-semibold text-base">
        {{ label }}
        <span class="font-normal text-mono-500">{{ id }}</span>
      </div>
      <ul class="bk-pill-list mt-3">
        <li>
          <span class="bk-pill bk-is-mono-dark">{{ bundleLabel }}</span>
        </li>
        <li v-if="lastChanged">
          <span class="bk-pill bk-is-yellow-dark">
            <RelativeTime :timestamp="lastChanged" />
          </span>
        </li>
        <li v-if="isOwner">
          <span class="bk-pill bk-is-strong">{{ $t('owner', 'Owner') }}</span>
        </li>
      </ul>
    </div>
  </a>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { RelativeTime } from '#blokkli/editor/components'
import type { HostEntitySearchResultItem } from '#blokkli/editor/providers/workspaces'

defineProps<
  HostEntitySearchResultItem & {
    focused: boolean
    bundleLabel: string
    isOwner: boolean
  }
>()

const { $t } = useBlokkli()
</script>
