<template>
  <div class="bk-debug-list">
    <div>
      <button
        class="bk-button bk-scheme-mono bk-is-small"
        :disabled="!!diffItems"
        @click.prevent="startDiffApprovalTest"
      >
        Diff approval (host title + lead + a card title)
      </button>
    </div>
    <div v-if="diffItems" class="text-sm text-mono-600">
      Accept/reject the changes, then apply or cancel. Watch whether the
      <code>&lt;ins&gt;</code>/<code>&lt;del&gt;</code> markup is cleaned up —
      the host-entity fields (<code>title</code>/<code>lead</code> on the page)
      are the ones that currently get stuck; the card title (a block) cleans up
      fine.
    </div>
  </div>

  <DiffApproval
    v-if="diffItems"
    :items="diffItems"
    show-reason
    @apply="endTest"
    @cancel="endTest"
  />
</template>

<script setup lang="ts">
import { ref, useBlokkli } from '#imports'
import { DiffApproval } from '#blokkli/editor/components'
import type { ApprovalItem } from '#blokkli/editor/components/DiffApproval/types'
import { itemEntityType } from '#blokkli-build/config'

const { directive, fieldValue, context } = useBlokkli()

const diffItems = ref<ApprovalItem[] | null>(null)

/**
 * Produce a value that visibly differs from the original so the diff preview
 * renders insertion/deletion markup. Works for both plain and markup fields —
 * for markup the suffix is simply appended after the existing HTML.
 */
function makeProposedValue(current: string): string {
  return current
    ? `${current} — edited by debug test`
    : 'edited by debug test'
}

/**
 * Show the approval UI for a small, fixed set of editables: the host entity's
 * `title` and `lead` (the buggy case) plus one random card-block title (the
 * working case, for comparison). Applying does NOT mutate anything (see
 * `endTest`), so this is a pure preview/cleanup test.
 */
function startDiffApprovalTest() {
  const all = directive.getAllEditables()
  const hostUuid = context.value.entityUuid

  const targets = all.filter(
    (e) => e.uuid === hostUuid && (e.fieldName === 'title' || e.fieldName === 'lead'),
  )

  const cardTitles = all.filter(
    (e) =>
      e.type === itemEntityType &&
      e.bundle === 'card' &&
      e.fieldName === 'title',
  )
  const randomCard = cardTitles[Math.floor(Math.random() * cardTitles.length)]
  if (randomCard) targets.push(randomCard)

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
      // Tag with the entity type so host fields are identifiable in the toolbar.
      fieldLabel: `${target.fieldName} (${target.type})`,
      value: makeProposedValue(current ?? ''),
    })
  }

  diffItems.value = items.length ? items : null
}

/**
 * Tear down the test. Unmounting DiffApproval restores each field's preview
 * overlay (re-inserting the original Vue-managed nodes), which is exactly the
 * cleanup path this scenario exercises for host-entity fields.
 */
function endTest() {
  diffItems.value = null
}
</script>
