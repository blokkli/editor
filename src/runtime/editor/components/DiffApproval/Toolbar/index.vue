<template>
  <Teleport v-if="ui.mainLayoutElement.value" :to="ui.mainLayoutElement.value">
    <div class="bk bk-diff-approval-toolbar-hint bk-control">
      {{
        $t(
          'aiAgentApprovalHint',
          'Review changes and accept or reject them individually. Tab/Arrow keys: navigate, Space/Enter: accept/reject.',
        )
      }}
    </div>
    <div class="bk bk-diff-approval-toolbar bk-control">
      <button class="bk-diff-approval-toolbar-nav" @click="$emit('prev')">
        <Icon name="bk_mdi_chevron_left" />
        <div class="bk-tooltip">
          <span>{{ $t('aiAgentApprovalPrevChange', 'Previous change') }}</span>
          <ShortcutIndicator
            key-code="ArrowLeft"
            :label="$t('aiAgentApprovalPrevChange', 'Previous change')"
            @pressed="$emit('prev')"
          />
        </div>
      </button>
      <button class="bk-diff-approval-toolbar-nav" @click="$emit('next')">
        <Icon name="bk_mdi_chevron_right" />
        <div class="bk-tooltip">
          <span>{{ $t('aiAgentApprovalNextChange', 'Next change') }}</span>
          <ShortcutIndicator
            key-code="ArrowRight"
            :label="$t('aiAgentApprovalNextChange', 'Next change')"
            @pressed="$emit('next')"
          />
        </div>
      </button>

      <div class="bk-diff-approval-toolbar-info">
        <span class="bk-diff-approval-toolbar-counter">
          {{ currentIndex + 1 }} / {{ totalItems }}
        </span>
        <span class="bk-diff-approval-toolbar-label">
          {{ currentItem.fieldLabel }}
          <template v-if="bundleLabel"> &middot; {{ bundleLabel }}</template>
        </span>
      </div>

      <div class="bk-diff-approval-toolbar-toggle">
        <FormToggle
          :model-value="selected[currentItem.id]"
          :label="$t('aiAgentApprovalAccept', 'Accept')"
          @update:model-value="toggleCurrent"
        />
        <div class="bk-tooltip">
          <span>{{ $t('aiAgentApprovalToggle', 'Toggle approval') }}</span>
          <ShortcutIndicator
            key-code="Enter"
            :label="$t('aiAgentApprovalToggle', 'Toggle approval')"
            @pressed="toggleCurrent"
          />
        </div>
      </div>

      <div
        v-if="!selected[currentItem.id]"
        class="bk-diff-approval-toolbar-reason"
      >
        <input
          type="text"
          :value="reasons[currentItem.id]"
          :placeholder="
            $t(
              'aiAgentBatchRewriteReasonPlaceholder',
              'Reason for rejection (optional)',
            )
          "
          @input="onReasonInput"
        />
      </div>

      <button class="bk-button bk-is-lime" @click="$emit('apply')">
        <span>{{ applyLabel }}</span>
      </button>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon, FormToggle, ShortcutIndicator } from '#blokkli/editor/components'
import type { ApprovalItem } from '../types'

const props = defineProps<{
  currentItem: ApprovalItem
  currentIndex: number
  totalItems: number
  selected: Record<number, boolean>
  reasons: Record<number, string>
  applyLabel: string
}>()

const emit = defineEmits<{
  (e: 'update:selected', id: number, value: boolean): void
  (e: 'update:reasons', id: number, value: string): void
  (e: 'apply' | 'prev' | 'next'): void
}>()

const { ui, blocks, types, $t } = useBlokkli()

const bundleLabel = computed(() => {
  const item = props.currentItem
  const block = blocks.getBlock(item.uuid)
  if (!block) return ''
  const def = types.getBlockBundleDefinition(block.bundle)
  return def?.label || block.bundle
})

function toggleCurrent() {
  const item = props.currentItem
  emit('update:selected', item.id, !props.selected[item.id])
}

function onReasonInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:reasons', props.currentItem.id, value)
}
</script>
