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
    <div class="bk-pill-list mt-3">
      <Pill :text="bundleLabel" scheme="mono" />
      <Pill v-if="lastChanged" scheme="yellow">
        <RelativeTime :timestamp="lastChanged" />
      </Pill>
      <Pill v-if="isOwner" :text="$t('owner', 'Owner')" scheme="accent" />
    </div>
  </FormRadioBox>
</template>

<script lang="ts" setup>
import { useBlokkli } from '#imports'
import { FormRadioBox, RelativeTime, Pill } from '#blokkli/editor/components'
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
