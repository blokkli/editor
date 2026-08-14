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

  <button
    type="button"
    class="bk-button bk-scheme-mono bk-is-small"
    data-test="run-chunk-diff-approval"
    :disabled="!!pendingDiff"
    @click.prevent="runChunkDemo"
  >
    Chunk approval (multi-paragraph rewrite on a Text block)
  </button>
  <p v-if="chunkMessage" class="text-xs text-mono-500 px-5">
    {{ chunkMessage }}
  </p>

  <!-- DiffApproval teleports its UI into the canvas overlay + main layout, so it
       renders correctly even though this host is otherwise invisible. -->
  <DiffApproval
    v-if="pendingDiff"
    :items="pendingDiff"
    show-reason
    editable
    @apply="onApply"
    @cancel="onCancel"
  />
</template>

<script setup lang="ts">
import { ref, useBlokkli, onMounted } from '#imports'
import { DiffApproval } from '#blokkli/editor/components'
import type {
  ApprovalItem,
  DiffApplyPayload,
} from '#blokkli/editor/components/DiffApproval/types'
import {
  flattenSegments,
  reassembleValue,
  splitIntoSegments,
} from '#blokkli/editor/helpers/diff'
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

const { directive, fieldValue, context, state, adapter, types, blocks } =
  useBlokkli()

const pendingDiff = ref<ApprovalItem[] | null>(null)
let resolvePending: ((result: { applied: boolean }) => void) | null = null
// When true, applying the current scenario persists the accepted items via the
// adapter (a real mutation + history entry); otherwise apply is a no-op cleanup.
let applyMutates = false

/** Inline hint shown below the chunk-demo button (e.g. "add a Text block first"). */
const chunkMessage = ref('')

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

/**
 * Diff scenario for arbitrary fields, resolved from the editable field CONFIG
 * rather than from the rendered editable elements.
 *
 * The other scenarios all start at `directive.getAllEditables()`, so they can
 * only ever target fields that carry the editable directive — which makes the
 * interesting case unreachable. A field declared purely through
 * `propsFieldMapping` has no element of its own, so its highlight falls back to
 * the block, and several of them collapse into one merged stop.
 *
 * Applying persists every accepted field, so a spec can assert that one
 * decision on a merged stop really did write (or skip) all of them.
 */
function runFieldsDiffApproval(target: {
  uuid?: string
  fields: Array<{ fieldName: string; value: string }>
}): Promise<{ applied: boolean }> {
  const uuid = target.uuid ?? context.value.entityUuid
  const isHost = uuid === context.value.entityUuid
  const entityType = isHost ? context.value.entityType : itemEntityType
  const bundle = isHost
    ? context.value.entityBundle
    : (blocks.getBlock(uuid)?.bundle ?? '')

  const items: ApprovalItem[] = []
  let id = 0
  for (const field of target.fields) {
    const config = types.editableFieldConfig.forName(
      entityType,
      bundle,
      field.fieldName,
    )
    if (!config) continue
    items.push({
      id: id++,
      uuid,
      fieldName: field.fieldName,
      fieldLabel: config.label,
      value: field.value,
    })
  }

  if (!items.length) {
    return Promise.resolve({ applied: false })
  }

  applyMutates = true
  pendingDiff.value = items
  return new Promise((resolve) => {
    resolvePending = resolve
  })
}

/** Persist one accepted item via the adapter (host vs. block field). */
async function persistItem(item: ApprovalItem): Promise<void> {
  await persistValue(item.uuid, item.fieldName, item.value)
}

async function persistValue(
  uuid: string,
  fieldName: string,
  value: string,
): Promise<void> {
  if (uuid === context.value.entityUuid) {
    await state.mutateWithLoadingState(() =>
      adapter.updateEntityFieldValue!({ fieldName, fieldValue: value }),
    )
    return
  }
  await state.mutateWithLoadingState(() =>
    adapter.updateFieldValue!({ uuid, fieldName, fieldValue: value }),
  )
}

/**
 * Chunk-level diff scenario: seeds the field with `before`, then drives a
 * DiffApproval with `before → after` segmented via `splitIntoSegments`. On
 * apply, the reassembled hybrid (accepted chunks + original chunks for
 * rejected ones) is persisted exactly like the agent tools do. Used by the
 * chunk e2e test to drive a deterministic markup-field shape.
 */
async function applyChunkFieldDiff(target: {
  fieldName: string
  uuid?: string
  before: string
  after: string
}): Promise<{ applied: boolean }> {
  const uuid = target.uuid ?? context.value.entityUuid
  const editable = directive
    .getAllEditables()
    .find((e) => e.fieldName === target.fieldName && e.uuid === uuid)
  if (!editable) {
    return Promise.resolve({ applied: false })
  }

  // Seed the field so the rendered DOM matches `before` — segments line up
  // with actual child elements, and the after-apply read-back is meaningful.
  await persistValue(uuid, target.fieldName, target.before)

  const segments =
    splitIntoSegments(target.before, target.after, 'markup') ?? undefined

  applyMutates = true
  pendingDiff.value = [
    {
      id: 0,
      uuid,
      fieldName: target.fieldName,
      fieldLabel: `${target.fieldName} (${editable.type})`,
      value: target.after,
      segments,
    },
  ]
  return new Promise((resolve) => {
    resolvePending = resolve
  })
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

async function onApply(data: DiffApplyPayload) {
  if (applyMutates && pendingDiff.value) {
    // Mutate before closing so the field is patched to the new value as the
    // preview overlay is torn down (the real consumer order).
    for (const item of pendingDiff.value) {
      // A manually edited item resolves as a single whole-field unit with the
      // revised value — its segments (still present here) are superseded.
      const editedValue = data.edited[String(item.id)]
      if (editedValue !== undefined) {
        if (data.selected[String(item.id)] !== false) {
          await persistValue(item.uuid, item.fieldName, editedValue)
        }
        continue
      }
      if (item.segments) {
        const atoms = flattenSegments(item.segments).filter(
          (s) => s.status !== 'matched' || s.beforeHtml !== s.afterHtml,
        )
        if (!atoms.length) continue
        const acceptedById: Record<string, boolean> = {}
        let accepted = 0
        for (const atom of atoms) {
          const key = `${item.id}:${atom.id}`
          const isAccepted = data.selected[key] !== false
          acceptedById[atom.id] = isAccepted
          if (isAccepted) accepted++
        }
        if (!accepted) continue
        await persistValue(
          item.uuid,
          item.fieldName,
          reassembleValue(item.segments, acceptedById),
        )
      } else if (data.selected[String(item.id)]) {
        await persistItem(item)
      }
    }
  }
  settle(true)
}

function onCancel() {
  settle(false)
}

/**
 * Inline demo: target the first Text block on the page and trigger a
 * chunk-level DiffApproval using a multi-paragraph rewrite. Lets you try
 * per-`<li>` accept/reject from the playground without writing an E2E test.
 *
 * Seeds the chosen block's `text` field with the demo `before` so the chunk
 * shape is deterministic regardless of prior edits. Undoing rolls back both
 * the seed and the apply.
 */
async function runChunkDemo(): Promise<void> {
  chunkMessage.value = ''
  const target = directive
    .getAllEditables()
    .find(
      (e) =>
        e.type === itemEntityType &&
        e.bundle === 'text' &&
        e.fieldName === 'text',
    )
  if (!target) {
    chunkMessage.value =
      'Add a Text block to the page first, then click this button again.'
    return
  }

  const before = `<p>Bei einer Namensänderung benötigen Sie einen neuen Ausweis. Reichen Sie das Gesuch beim Strassenverkehrsamt ein.</p>
<ul>
  <li>Kopie von ID, Pass oder Aufenthaltsbewilligung</li>
  <li>Aktueller Ausweis im Original</li>
  <li>Aktuelles Passfoto</li>
</ul>
<p>Sie können das Gesuch auch schriftlich einreichen.</p>`

  const after = `<p>Bei einer Namensänderung (z. B. durch Heirat) benötigen Sie einen neuen Lernfahr- oder Führerausweis. Sobald die Namensänderung beim Einwohnerdienst gemeldet ist, können Sie das Formular «Änderung Führerausweis» nutzen.</p>
<ul>
  <li>Kopie von ID, Pass oder Aufenthaltsbewilligung mit dem neuen Namen</li>
  <li>Aktueller Lernfahr- und/oder Führerausweis im Original</li>
  <li>Ein aktuelles, farbiges Passfoto in der Grösse 35 x 45 mm; frontale Aufnahme mit neutralem Hintergrund.</li>
</ul>
<p>Sie können uns die Namensänderung und das Gesuch für einen neuen Ausweis auch schriftlich einreichen.</p>`

  await applyChunkFieldDiff({
    fieldName: 'text',
    uuid: target.uuid,
    before,
    after,
  })
}

onMounted(() => {
  emit('register', {
    runDiffApproval,
    applyFieldDiff,
    applyChunkFieldDiff,
    runFieldsDiffApproval,
  })
})

defineOptions({
  name: 'TestCaseDiffApproval',
})
</script>
