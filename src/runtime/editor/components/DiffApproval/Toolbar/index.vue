<template>
  <Teleport v-if="ui.mainLayoutElement.value" :to="ui.mainLayoutElement.value">
    <div
      class="bk bk-control bk-diff-approval-toolbar-hint p-15 pointer-events-auto"
    />
    <div
      class="bk bk-control bk-diff-approval-toolbar self-end pointer-events-auto bg-mono-900 text-mono-50 select-none relative mx-15 mb-15 rounded shadow-xl-even outline outline-1 outline-mono-400"
      data-test="diff-approval-toolbar"
      :data-test-selected="isSelected"
      :data-test-unit-kind="kind"
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
          data-test="diff-approval-cancel"
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
            {{ stopIndex }} / {{ totalStops }}
          </span>
          <span class="font-medium whitespace-nowrap">
            {{ label }}
            <template v-if="bundleLabel"> &middot; {{ bundleLabel }}</template>
            <template v-if="kind === 'segment' && segmentTag">
              &middot;
              <span class="font-mono text-mono-300"
                >&lt;{{ segmentTag }}&gt;</span
              >
              {{ segmentIndex }}
            </template>
          </span>
        </div>

        <div
          class="group/tooltip relative h-full"
          :class="{ 'mr-auto': !canEdit }"
        >
          <FormToggle
            class="mx-15"
            color-scheme="dark"
            stretch
            :model-value="isSelected"
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

        <div v-if="canEdit" class="group/tooltip relative h-full mr-auto">
          <button
            class="h-full px-10 flex items-center gap-5 hover:bg-mono-800"
            data-test="diff-approval-edit"
            @click="$emit('edit')"
          >
            <Icon name="bk_mdi_edit" class="size-20" />
            <span>{{ $t('aiAgentApprovalEdit', 'Edit') }}</span>
          </button>
          <Tooltip
            :label="
              $t(
                'aiAgentApprovalEditText',
                'Manually edit the suggested text. The editor opens with the entire field value.',
              )
            "
            placement="above-left"
          >
            <template #shortcut>
              <ShortcutIndicator
                key-code="e"
                :label="$t('aiAgentApprovalEdit', 'Edit')"
                @pressed="$emit('edit')"
              />
            </template>
          </Tooltip>
        </div>

        <div v-if="!isSelected && showReason" class="flex-1 min-w-0 px-10">
          <input
            type="text"
            class="w-full h-30 px-10 rounded bg-mono-800 text-mono-100 text-sm border border-mono-600 outline-none placeholder:text-mono-500 focus:border-mono-400"
            :value="reason"
            :placeholder="
              $t(
                'aiAgentBatchRewriteReasonPlaceholder',
                'Reason for rejection (optional)',
              )
            "
            @keydown.stop
            @keyup.stop
            @input="onReasonInput"
          />
        </div>

        <button
          class="bk-button bk-scheme-lime rounded-l-none! rounded-tr-none!"
          data-test="diff-approval-apply"
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
import type { ApprovalStop } from '../types'

/**
 * Everything the toolbar needs about the current stop, as scalars.
 *
 * It deliberately never sees the `selected`/`reasons` maps: a stop can stand for
 * several changes at once, and a toolbar that indexed those maps itself would
 * show — and write — only the first of them.
 */
const props = defineProps<{
  currentStop: ApprovalStop
  /** The field(s) behind the current stop, already joined for display. */
  label: string
  kind: ApprovalStop['kind']
  /** Tag name of the current chunk, when the stop is one. */
  segmentTag?: string | null
  /**
   * 1-based position of the current stop across the whole batch — the same
   * count the user can step through, so it includes per-chunk stops for
   * segmented fields and counts a merged group once.
   */
  stopIndex: number
  totalStops: number
  /**
   * 1-based segment index within the current field. 0 when the current stop
   * is not a chunk (the segment chip is hidden in that case).
   */
  segmentIndex: number
  isSelected: boolean
  reason: string
  applyLabel: string
  /**
   * Whether to show the rejection reason input.
   *
   * Used by the agent tools to capture feedback for the LLM. Features that
   * apply changes directly (e.g. automatic translation) leave it off.
   */
  showReason?: boolean

  /**
   * Whether the current stop's field supports manual editing of the suggested
   * value. Editing always operates on the whole field, even on chunk stops.
   */
  canEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selected', value: boolean): void
  (e: 'update:reason', value: string): void
  (e: 'apply' | 'prev' | 'next' | 'cancel' | 'edit'): void
}>()

const { ui, blocks, types, $t } = useBlokkli()

const bundleLabel = computed(() => {
  const block = blocks.getBlock(props.currentStop.uuid)
  if (!block) return ''
  const def = types.getBlockBundleDefinition(block.bundle)
  return def?.label || block.bundle
})

function toggleCurrent() {
  emit('update:selected', !props.isSelected)
}

function onReasonInput(event: Event) {
  emit('update:reason', (event.target as HTMLInputElement).value)
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
