<template>
  <div class="bk-agent-tool-card">
    <div class="bk-agent-tool-card-header">
      <Icon :name="icon" />
      <span>{{ title }}</span>
      <div class="bk-agent-tool-card-header-cancel">
        <button type="button" @click="$emit('cancel')">
          <Icon name="bk_mdi_close" />
        </button>
        <div class="bk-tooltip">
          <span>{{ $t('aiAgentReject', 'Reject') }}</span>
        </div>
      </div>
    </div>

    <slot />

    <div v-if="$slots.actions" class="bk-agent-tool-card-actions">
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
