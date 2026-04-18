<template>
  <div class="bk-agent-tool-card">
    <div class="bk-agent-tool-card-header">
      <div class="bk-agent-tool-card-header-left">
        <Icon :name="icon" />
        <span>{{ title }}</span>
      </div>
      <div
        v-if="!hideCancel"
        class="bk-agent-tool-card-header-cancel group/tooltip relative"
      >
        <button type="button" @click="$emit('cancel')">
          <Icon name="bk_mdi_close" />
        </button>
        <Tooltip
          :label="$t('aiAgentReject', 'Reject')"
          placement="above-right"
        />
      </div>
    </div>

    <slot />

    <div v-if="$slots.actions" class="bk-agent-tool-card-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Icon, Tooltip } from '#blokkli/editor/components'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { useBlokkli } from '#imports'

defineProps<{
  icon: BlokkliIcon
  title: string
  hideCancel?: boolean
}>()

defineEmits<{
  (e: 'cancel'): void
}>()

const { $t } = useBlokkli()
</script>
