<template>
  <FormRadioBox
    v-model="selectedUuid"
    :value="uuid"
    name="entity"
    :title="label"
  >
    <template #title>
      <span class="truncate">
        {{ label }}
        <span class="font-normal text-mono-500">{{ id }}</span>
      </span>
    </template>
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
  </FormRadioBox>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { FormRadioBox, RelativeTime } from '#blokkli/editor/components'
import type { HostEntitySearchResultItem } from '#blokkli/editor/providers/workspaces'

defineProps<
  HostEntitySearchResultItem & {
    bundleLabel: string
    isOwner: boolean
  }
>()

const selectedUuid = defineModel<string>('selectedUuid', { required: true })

const { $t } = useBlokkli()
</script>
