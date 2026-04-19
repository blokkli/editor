<template>
  <label
    class="flex items-start gap-5 cursor-pointer hover:bg-mono-50 p-10 border border-mono-200 rounded-md hover:border-mono-400 min-w-0"
    :class="{
      '!border-accent-600 outline outline-4 outline-accent-200 !bg-accent-50':
        isSelected,
    }"
  >
    <span class="bk-radio">
      <input v-model="selectedUuid" type="radio" :value="uuid" name="entity" />
      <span />
    </span>
    <div class="flex-1 min-w-0">
      <div class="truncate font-semibold text-base">
        {{ label }}
        <span class="font-normal text-mono-500">{{ id }}</span>
      </div>
      <ul class="bk-pill-list mt-3">
        <li>
          <span class="bk-pill bk-is-mono">{{ bundleLabel }}</span>
        </li>
        <li v-if="lastChanged">
          <span class="bk-pill bk-is-yellow-light">
            <RelativeTime :timestamp="lastChanged" />
          </span>
        </li>
        <li v-if="isOwner">
          <span class="bk-pill">{{ $t('owner', 'Owner') }}</span>
        </li>
      </ul>
    </div>
  </label>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { RelativeTime } from '#blokkli/editor/components'
import type { HostEntitySearchResultItem } from '#blokkli/editor/providers/workspaces'

const props = defineProps<
  HostEntitySearchResultItem & {
    bundleLabel: string
    isOwner: boolean
  }
>()

const selectedUuid = defineModel<string>('selectedUuid', { required: true })

const isSelected = computed(() => {
  return selectedUuid.value === props.uuid
})

const { $t } = useBlokkli()
</script>
