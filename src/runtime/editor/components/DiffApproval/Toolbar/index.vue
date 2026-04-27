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
      <button
        class="bk-diff-approval-toolbar-nav group/tooltip"
        @click="$emit('prev')"
      >
        <Icon name="bk_mdi_chevron_left" />
        <Tooltip
          :label="$t('aiAgentApprovalPrevChange', 'Previous change')"
          placement="above-left"
        >
          <template #shortcut>
            <ShortcutIndicator
              key-code="ArrowLeft"
              :label="$t('aiAgentApprovalPrevChange', 'Previous change')"
              @pressed="$emit('prev')"
            />
          </template>
        </Tooltip>
      </button>
      <button
        class="bk-diff-approval-toolbar-nav group/tooltip"
        @click="$emit('next')"
      >
        <Icon name="bk_mdi_chevron_right" />
        <Tooltip
          placement="above-left"
          :label="$t('aiAgentApprovalNextChange', 'Next change')"
        >
          <template #shortcut>
            <ShortcutIndicator
              key-code="ArrowRight"
              :label="$t('aiAgentApprovalNextChange', 'Next change')"
              @pressed="$emit('next')"
            />
          </template>
        </Tooltip>
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

      <div class="bk-diff-approval-toolbar-toggle group/tooltip">
        <FormToggle
          :model-value="selected[currentItem.id]"
          :label="$t('aiAgentApprovalAccept', 'Accept')"
          @update:model-value="toggleCurrent"
        />
        <Tooltip
          :label="$t('aiAgentApprovalToggle', 'Toggle approval')"
          placement="above-left"
        >
          <template #shortcut>
            <ShortcutIndicator
              key-code="Enter"
              :label="$t('aiAgentApprovalToggle', 'Toggle approval')"
              @pressed="toggleCurrent"
            />
          </template>
        </Tooltip>
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

      <button class="bk-button bk-scheme-lime" @click="$emit('apply')">
        <span>{{ applyLabel }}</span>
      </button>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import {
  Icon,
  FormToggle,
  ShortcutIndicator,
  Tooltip,
} from '#blokkli/editor/components'
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

<style lang="postcss">
.bk.bk-diff-approval-toolbar-hint {
  grid-area: mode;
  @apply self-start justify-self-stretch;
  @apply h-40 flex items-center px-10 py-5;
  @apply text-mono-100;
  @apply bg-mono-900;
  @apply border-t border-t-mono-600;
  @apply font-medium;
  @apply text-sm;
}
.bk.bk-diff-approval-toolbar {
  grid-area: viewport;
  align-self: end;
  @apply pointer-events-auto;
  @apply flex items-center h-50;
  @apply bg-mono-900 text-mono-50;
  @apply select-none relative;
  @apply mx-15 mb-15 rounded-md;
  @apply shadow-xl-even;
  @apply outline outline-1 outline-mono-400;

  color-scheme: dark;

  .bk-diff-approval-toolbar-toggle,
  .bk-diff-approval-toolbar-nav {
    @apply relative h-full;
  }

  .bk-diff-approval-toolbar-toggle {
    @apply mr-auto;
  }

  > .bk-button {
    @apply rounded-l-none;
  }

  .bk-diff-approval-toolbar-nav {
    @apply shrink-0 size-50 flex items-center justify-center;
    @apply text-mono-300 hover:text-white hover:bg-mono-800 relative;

    &:first-child {
      @apply rounded-l-md;
    }

    svg {
      @apply size-30 fill-current;
    }
  }

  .bk-checkbox-toggle {
    @apply flex items-center text-mono-200 hover:text-white mx-15;
  }

  .bk-diff-approval-toolbar-info {
    @apply flex items-center gap-10 px-15;
    @apply border-l border-l-mono-600 h-full;
  }

  .bk-diff-approval-toolbar-counter {
    @apply text-mono-400 tabular-nums whitespace-nowrap;
  }

  .bk-diff-approval-toolbar-label {
    @apply font-medium whitespace-nowrap;
  }

  .bk-diff-approval-toolbar-reason {
    @apply flex-1 min-w-0 px-10;

    input {
      @apply w-full h-30 px-10 rounded bg-mono-800 text-mono-100 text-sm;
      @apply border border-mono-600 outline-none;
      @apply placeholder:text-mono-500;
      @apply focus:border-mono-400;
    }
  }

  .bk-diff-approval-toolbar-apply {
    @apply shrink-0 h-30 px-10 rounded font-medium ml-auto mr-10;
    @apply bg-lime-normal text-mono-950;
    @apply hover:brightness-110;
  }
}
</style>
