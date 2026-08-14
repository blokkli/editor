<template>
  <div
    v-show="!hidden"
    class="absolute top-0 left-0 rounded"
    :class="[
      selected
        ? 'border-lime-normal outline-lime-normal/30'
        : 'border-red-normal outline-red-normal/30',
      isActive
        ? 'border-4 outline-[5px] rounded-tl-none'
        : 'border hover:border-mono-500 hover:bg-mono-400/20',
    ]"
    :style="rect"
    data-test="diff-approval-highlight-item"
    :data-test-active="isActive"
    :data-test-selected="selected"
    :data-test-kind="stop.kind"
    :data-test-fallback="stop.kind === 'group'"
    :data-test-segment-id="segmentId"
  >
    <button class="size-full block" @click.prevent="emit('activate')" />
    <div v-show="isActive" class="absolute left-[-3px] bottom-full flex gap-3">
      <button
        class="h-30 px-8 flex items-center justify-center gap-5 text-white rounded-t-md"
        :class="
          selected
            ? 'bg-lime-normal hover:bg-lime-dark'
            : 'bg-red-normal hover:bg-red-dark'
        "
        @click.prevent="emit('toggle')"
      >
        <Icon
          :name="selected ? 'bk_mdi_check' : 'bk_mdi_close'"
          class="size-20 p-2 rounded flex items-center justify-center border border-white"
          :class="selected ? 'text-lime-normal bg-white' : 'text-white'"
        />
        <span
          class="text-xs font-semibold uppercase tracking-wider leading-none translate-y-1"
        >
          {{
            selected
              ? $t('aiAgentApprovalAccepted', 'Accepted')
              : $t('aiAgentApprovalRejected', 'Rejected')
          }}
        </span>
      </button>
      <button
        v-if="canEdit"
        class="h-30 px-8 flex items-center justify-center gap-5 text-white rounded-t-md bg-mono-800 hover:bg-mono-700"
        data-test="diff-approval-highlight-edit"
        @click.prevent="emit('edit')"
      >
        <Icon name="bk_mdi_edit" class="size-20 p-2" />
        <span
          class="text-xs font-semibold uppercase tracking-wider leading-none translate-y-1"
        >
          {{ $t('aiAgentApprovalEdit', 'Edit') }}
        </span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/editor/components'
import type { ApprovalStop, StopRect } from '../types'

/**
 * One accept/reject rectangle. Purely presentational: it resolves nothing and
 * owns no state — the owning DiffApproval decides what a stop covers, whether
 * it is accepted, and where it sits.
 */
const props = defineProps<{
  stop: ApprovalStop
  rect: StopRect
  selected: boolean
  isActive: boolean
  /**
   * Whether a manual edit is open on this stop's field, in which case the
   * rectangle steps aside so the editable overlay owns the field.
   */
  hidden?: boolean
  canEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'activate' | 'toggle' | 'edit'): void
}>()

const { $t } = useBlokkli()

const segmentId = computed(() => {
  const unit = props.stop.units[0]
  return unit?.kind === 'segment' ? unit.segment.id : null
})
</script>
