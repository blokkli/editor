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
      <div class="bk-pill-list mt-3">
        <Pill :text="bundleLabel" variant="dark" scheme="mono" />
        <Pill v-if="lastChanged" scheme="yellow" variant="dark">
          <RelativeTime :timestamp="lastChanged" />
        </Pill>
        <Pill v-if="isOwner" :text="$t('owner', 'Owner')" variant="dark" />
      </div>
    </div>
  </a>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { RelativeTime, Pill } from '#blokkli/editor/components'
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
