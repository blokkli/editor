<template>
  <button
    type="button"
    class="bk-button bk-scheme-mono bk-is-small"
    data-test="run-diff-approval"
    :disabled="!!pendingDiff"
    @click.prevent="() => runDiffApproval()"
  >
    Diff approval (host title + lead + a card title)
  </button>

  <!-- DiffApproval teleports its UI into the canvas overlay + main layout, so it
       renders correctly even though this host is otherwise invisible. -->
  <DiffApproval
    v-if="pendingDiff"
    :items="pendingDiff"
    show-reason
    @apply="onApply"
    @cancel="onCancel"
  />
</template>

<script setup lang="ts">
import { ref, useBlokkli, onMounted } from '#imports'
import { DiffApproval } from '#blokkli/editor/components'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'
import { itemEntityType } from '#blokkli-build/config'
import type { BlokkliTestApi } from '../../types'

/**
 * DiffApproval test case: drives the DiffApproval preview to exercise its
 * DOM-restore behaviour (cancel/apply) and the real apply → undo path. Owns its
 * own trigger button + scenario state and registers its slice of the imperative
 * test API with the parent feature.
 */
const emit = defineEmits<{
  register: [api: Partial<BlokkliTestApi>]
}>()

const { directive, fieldValue, context, state, adapter } = useBlokkli()

const pendingDiff = ref<ApprovalItem[] | null>(null)
let resolvePending: ((result: { applied: boolean }) => void) | null = null
// When true, applying the current scenario persists the accepted items via the
// adapter (a real mutation + history entry); otherwise apply is a no-op cleanup.
let applyMutates = false

/**
 * Produce a value that visibly differs from the original so the diff preview
 * renders insertion/deletion markup. Works for both plain and markup fields.
 */
function makeProposedValue(current: string): string {
  return current ? `${current} — edited by test` : 'edited by test'
}

/**
 * Build the fixed scenario: the host entity's `title` and `lead` (the bare
 * `v-blokkli-editable` directive case that the DOM-restore fix targets) plus
 * one random card-block `title` (the block case, for comparison).
 */
function buildDiffApprovalItems(): ApprovalItem[] {
  const all = directive.getAllEditables()
  const hostUuid = context.value.entityUuid

  const targets = all.filter(
    (e) =>
      e.uuid === hostUuid &&
      (e.fieldName === 'title' || e.fieldName === 'lead'),
  )

  const cardTitles = all.filter(
    (e) =>
      e.type === itemEntityType &&
      e.bundle === 'card' &&
      e.fieldName === 'title',
  )
  const randomCard = cardTitles[Math.floor(Math.random() * cardTitles.length)]
  if (randomCard) {
    targets.push(randomCard)
  }

  const items: ApprovalItem[] = []
  let id = 0
  for (const target of targets) {
    const host = {
      type: target.type,
      bundle: target.bundle,
      uuid: target.uuid,
    }
    const current = fieldValue.readFieldValue(target.fieldName, host)?.value
    items.push({
      id: id++,
      uuid: target.uuid,
      fieldName: target.fieldName,
      fieldLabel: `${target.fieldName} (${target.type})`,
      value: makeProposedValue(current ?? ''),
    })
  }

  return items
}

function runDiffApproval(opts?: {
  reverseOrder?: boolean
}): Promise<{ applied: boolean }> {
  let items = buildDiffApprovalItems()
  if (!items.length) {
    return Promise.resolve({ applied: false })
  }
  // Pass items in reverse so prop order ≠ visual sort order — required to
  // exercise the keyboard-sync bug between toolbar and highlight (Space/Enter
  // would silently agree if both orders matched).
  if (opts?.reverseOrder) {
    items = items.slice().reverse()
  }
  applyMutates = false
  pendingDiff.value = items
  return new Promise((resolve) => {
    resolvePending = resolve
  })
}

/**
 * Single-field diff scenario whose apply performs a REAL mutation: applying
 * persists `value` to the field via the adapter (creating a history entry that
 * can be undone), the same way the agent/translation tools commit accepted
 * diffs. Used to test the end-to-end apply → committed value → undo path.
 *
 * Pass `uuid` for a block field; omit it for a host-entity field.
 */
function applyFieldDiff(target: {
  fieldName: string
  uuid?: string
  value: string
}): Promise<{ applied: boolean }> {
  const uuid = target.uuid ?? context.value.entityUuid
  const editable = directive
    .getAllEditables()
    .find((e) => e.fieldName === target.fieldName && e.uuid === uuid)
  if (!editable) {
    return Promise.resolve({ applied: false })
  }
  applyMutates = true
  pendingDiff.value = [
    {
      id: 0,
      uuid,
      fieldName: target.fieldName,
      fieldLabel: `${target.fieldName} (${editable.type})`,
      value: target.value,
    },
  ]
  return new Promise((resolve) => {
    resolvePending = resolve
  })
}

/** Persist one accepted item via the adapter (host vs. block field). */
async function persistItem(item: ApprovalItem): Promise<void> {
  if (item.uuid === context.value.entityUuid) {
    await state.mutateWithLoadingState(() =>
      adapter.updateEntityFieldValue!({
        fieldName: item.fieldName,
        fieldValue: item.value,
      }),
    )
    return
  }
  await state.mutateWithLoadingState(() =>
    adapter.updateFieldValue!({
      uuid: item.uuid,
      fieldName: item.fieldName,
      fieldValue: item.value,
    }),
  )
}

/**
 * Tear down the scenario. Unmounting DiffApproval restores each field's preview
 * overlay (re-inserting the original Vue-managed nodes) — the exact cleanup path
 * this scenario exercises.
 */
function settle(applied: boolean) {
  pendingDiff.value = null
  applyMutates = false
  resolvePending?.({ applied })
  resolvePending = null
}

async function onApply(data: {
  selected: Record<number, boolean>
  reasons: Record<number, string>
}) {
  if (applyMutates && pendingDiff.value) {
    // Mutate before closing so the field is patched to the new value as the
    // preview overlay is torn down (the real consumer order).
    for (const item of pendingDiff.value.filter((i) => data.selected[i.id])) {
      await persistItem(item)
    }
  }
  settle(true)
}

function onCancel() {
  settle(false)
}

onMounted(() => {
  emit('register', { runDiffApproval, applyFieldDiff })
})

defineOptions({
  name: 'TestCaseDiffApproval',
})
</script>
