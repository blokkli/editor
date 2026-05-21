<template>
  <Teleport v-if="ui.mainLayoutElement.value" :to="ui.mainLayoutElement.value">
    <div
      class="bk bk-control bk-diff-approval-toolbar-hint p-15 pointer-events-auto"
    ></div>
    <div
      class="bk bk-control bk-diff-approval-toolbar self-end pointer-events-auto bg-mono-900 text-mono-50 select-none relative mx-15 mb-15 rounded shadow-xl-even outline outline-1 outline-mono-400"
    >
      <div
        class="text-mono-100 font-medium text-sm border-b border-b-mono-600 flex justify-between items-center"
      >
        <span class="p-10">{{
          $t(
            'aiAgentApprovalHint',
            'Review changes and accept or reject them individually. Tab/Arrow keys: navigate, Space/Enter: accept/reject.',
          )
        }}</span>
        <button
          class="hover:bg-mono-800 h-40 px-8 flex items-center gap-5 font-semibold"
          @click="$emit('cancel')"
        >
          <span>{{ $t('cancel', 'Cancel') }}</span>
          <Icon name="bk_mdi_close" class="size-20" />
        </button>
      </div>
      <div class="flex items-center h-50">
        <button
          class="bk-toolbar-button group/tooltip relative rounded-l-md"
          @click="$emit('prev')"
        >
          <Icon name="bk_mdi_arrow_back" />
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
          class="bk-toolbar-button group/tooltip relative"
          @click="$emit('next')"
        >
          <Icon name="bk_mdi_arrow_forward" />
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

        <div
          class="flex items-center gap-10 px-15 border-l border-l-mono-600 h-full"
        >
          <span class="text-mono-400 tabular-nums whitespace-nowrap">
            {{ currentIndex + 1 }} / {{ totalItems }}
          </span>
          <span class="font-medium whitespace-nowrap">
            {{ currentItem.fieldLabel }}
            <template v-if="bundleLabel"> &middot; {{ bundleLabel }}</template>
          </span>
        </div>

        <div class="group/tooltip relative h-full mr-auto">
          <FormToggle
            class="mx-15"
            color-scheme="dark"
            stretch
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
          v-if="!selected[currentItem.id] && showReason"
          class="flex-1 min-w-0 px-10"
        >
          <input
            type="text"
            class="w-full h-30 px-10 rounded bg-mono-800 text-mono-100 text-sm border border-mono-600 outline-none placeholder:text-mono-500 focus:border-mono-400"
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

        <button
          class="bk-button bk-scheme-lime rounded-l-none! rounded-tr-none!"
          @click="$emit('apply')"
        >
          <span>{{ applyLabel }}</span>
        </button>
      </div>
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
  /**
   * Whether to show the rejection reason input.
   *
   * Used by the agent tools to capture feedback for the LLM. Features that
   * apply changes directly (e.g. automatic translation) leave it off.
   */
  showReason?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selected', id: number, value: boolean): void
  (e: 'update:reasons', id: number, value: string): void
  (e: 'apply' | 'prev' | 'next' | 'cancel'): void
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
/* Only properties that have no Tailwind utility remain here. Layout, colors and
   spacing live as utility classes in the template. */
.bk.bk-diff-approval-toolbar-hint {
  grid-area: mode;
}
.bk.bk-diff-approval-toolbar {
  grid-area: viewport;
  color-scheme: dark;
}
</style>
