<template>
  <div class="bk-agent-pending-mutation">
    <div class="bk-agent-pending-header">
      <Icon :name="icon" />
      <span>{{ title }}</span>
      <div class="bk-agent-pending-header-cancel">
        <button type="button" @click="$emit('cancel')">
          <Icon name="bk_mdi_close" />
        </button>
        <div class="bk-tooltip">
          <span>{{ $t('aiAgentReject', 'Reject') }}</span>
        </div>
      </div>
    </div>

    <slot />

    <div class="bk-agent-pending-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Icon } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { useBlokkli } from '#imports'

defineProps<{
  icon: BlokkliIcon
  title: string
}>()

defineEmits<{
  (e: 'cancel'): void
}>()

const { $t } = useBlokkli()
</script>
