import type { Page } from 'playwright-core'
import { withApp } from './session'

/** The number of blocks currently in the document (all fields). */
export function blockCount(page: Page): Promise<number> {
  return withApp(page, (app) => app.state.getAllUuids().length)
}

/**
 * Add a block programmatically — the cheap way to get a real mutation when a
 * test just needs pending changes (most do). This runs the same adapter call
 * the agent's add tools and the add-list drop handler use
 * (`state.mutateWithLoadingState(() => adapter.addNewBlock(...))`), so it
 * produces a genuine mutation + history entry — without the canvas drag, the
 * add-list, or the editable-overlay that a real drop opens.
 *
 * Defaults to a `text` block in the host entity's `content` field. For testing
 * the drag gesture itself, use `dragNewBlockIntoPage` instead.
 */
export function addBlock(
  page: Page,
  opts: { bundle?: string; fieldName?: string; entityUuid?: string } = {},
): Promise<void> {
  return page.evaluate(
    async ({ bundle, fieldName, entityUuid }) => {
      const app = window.__BLOKKLI__!.app!
      await app.state.mutateWithLoadingState(() =>
        app.adapter.addNewBlock({
          bundle,
          host: {
            type: app.context.value.entityType,
            uuid: entityUuid ?? app.context.value.entityUuid,
            fieldName,
          },
          afterUuid: null,
        }),
      )
    },
    {
      bundle: opts.bundle ?? 'text',
      fieldName: opts.fieldName ?? 'content',
      entityUuid: opts.entityUuid,
    },
  )
}

/** Resolve after two animation frames — long enough for an instant artboard
 *  pan + re-render to settle so freshly-read rects reflect the new position. */
function nextFrames(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
}

/**
 * Drag a new block of `bundle` from the add-list into a field via real pointer
 * input, dropping it just before the field's first block. Targets the host
 * entity's `content` field by default.
 *
 * No debug instrumentation is needed — the drop point is derived entirely from
 * already-exposed editor API. The drag itself is intricate, so the sequence is:
 *  1. Press the add-list rail item. The list is a ~50px rail but the item's
 *     rect reports its full expanded width, so clamp x to the rail width or the
 *     press lands on the canvas behind it.
 *  2. Arm the drag (`pointermove` > 7px while the button is held).
 *  3. Resolve the target field's first block and pan it into view via the
 *     `scrollIntoView` event — fields like `content` are taller than the
 *     viewport and start off-screen, so no insertion slot is reachable until a
 *     real block is visible. Then read that block's on-screen rect
 *     (`dom.getBlockRect` → `ui.getViewportRelativeRect`, which is zoom-correct).
 *  4. Carry the cursor toward the block's top edge, finishing with 2px steps so
 *     the final WebGL render frame latches the insert-before slot — `active`
 *     only updates while the cursor moves and `mouse:up` reads it synchronously,
 *     so a jump-then-release races the rAF and drops nothing. Then release.
 */
export async function dragNewBlockIntoPage(
  page: Page,
  bundle: string,
  opts: { fieldName?: string; entityUuid?: string } = {},
): Promise<void> {
  const fieldName = opts.fieldName ?? 'content'

  const start = await page.evaluate((b) => {
    const al = document.querySelector('#bk-add-list')!.getBoundingClientRect()
    const item = document
      .querySelector(`#blokkli-add-list-blocks [data-sortli-id="${b}"]`)!
      .getBoundingClientRect()
    return {
      x: Math.round(al.x + Math.min(al.width, item.width) / 2),
      y: Math.round(item.y + item.height / 2),
    }
  }, bundle)

  // Pan the target field's first block into view (instant), then read its rect.
  const targetUuid = await page.evaluate(
    ({ fieldName, entityUuid }) => {
      const app = window.__BLOKKLI__!.app!
      const host = entityUuid ?? app.context.value.entityUuid
      const block = app.state
        .getAllUuids()
        .map((u) => app.blocks.getBlock(u))
        .find((b) => b && b.host.fieldName === fieldName && b.host.uuid === host)
      if (!block) return null
      app.eventBus.emit('scrollIntoView', { uuid: block.uuid, immediate: true })
      return block.uuid
    },
    { fieldName, entityUuid: opts.entityUuid },
  )
  if (!targetUuid) {
    throw new Error(
      `No block found in field "${fieldName}" to anchor the drop against`,
    )
  }

  await nextFrames(page)

  const rect = await page.evaluate((uuid) => {
    const app = window.__BLOKKLI__!.app!
    app.dom.refreshBlockRect(uuid)
    const r = app.dom.getBlockRect(uuid)
    if (!r) return null
    const v = app.ui.getViewportRelativeRect(r)
    return { x: v.x, y: v.y, width: v.width, height: v.height }
  }, targetUuid)
  if (!rect) {
    throw new Error(`Could not read on-screen rect for block ${targetUuid}`)
  }

  const dropX = Math.round(rect.x + rect.width / 2)
  const dropY = Math.round(rect.y) + 6 // top edge → insert-before slot
  const carryFrom = Math.max(dropY - 40, 0)

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x, start.y + 12, { steps: 4 }) // arm (> 7px)
  await page.mouse.move(dropX, carryFrom, { steps: 15 }) // carry toward the slot
  // Finish with small steps so the final render frame latches `active`.
  for (let y = carryFrom; y <= dropY; y += 2) {
    await page.mouse.move(dropX, y)
  }
  await page.mouse.up()
}
