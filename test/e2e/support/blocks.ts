import type { Page } from 'playwright-core'
import { withApp } from './session'
import { emitEvent } from './events'
// Pull the dragging-overlay's event-bus augmentation into the e2e TS program so
// `dragging:moveToDropTarget` is known here — feature files under `src/runtime`
// aren't otherwise part of the playground-rooted e2e scope. Type-only side
// effect (the module has no runtime code).
import '../../../src/runtime/editor/features/dragging-overlay/types'

/** The number of blocks currently in the document (all fields). */
export function blockCount(page: Page): Promise<number> {
  return withApp(page, (app) => app.state.getAllUuids().length)
}

/** Select a block by `uuid` (emits the editor's `select` event). */
export function selectBlock(page: Page, uuid: string): Promise<void> {
  return emitEvent(page, 'select', uuid)
}

/** Select multiple blocks at once (the `select` event accepts a uuid array). */
export function selectBlocks(page: Page, uuids: string[]): Promise<void> {
  return emitEvent(page, 'select', uuids)
}

/** Whether a block is still present in the editor state. */
export function blockExists(page: Page, uuid: string): Promise<boolean> {
  return page.evaluate(
    (u) => !!window.__BLOKKLI__!.app!.blocks.getBlock(u),
    uuid,
  )
}

/**
 * Whether a block is actually *rendered* on the canvas — i.e. its
 * `[data-bk-uuid]` element is present in the DOM. Unlike `blockExists` (which
 * reads editor state), this asserts the page itself reflects the change, so it's
 * the right check after undo/redo or a history jump.
 */
export async function blockRendered(
  page: Page,
  uuid: string,
): Promise<boolean> {
  return (await page.locator(`[data-bk-uuid="${uuid}"]`).count()) > 0
}

/**
 * A block's bundle and rendered field props (e.g. `props.text`), read off the
 * live state. Returns nulls when the block isn't found. Useful for asserting
 * *what* a block is and what it holds, locale-independently.
 */
export function blockState(
  page: Page,
  uuid: string,
): Promise<{ bundle: string | null; props: Record<string, any> | null }> {
  return page.evaluate((u) => {
    const app = window.__BLOKKLI__!.app!
    return {
      bundle: app.blocks.getBlock(u)?.bundle ?? null,
      props: app.state.getFieldListItem(u)?.props ?? null,
    }
  }, uuid)
}

/**
 * Whether a block is rendered "muted" — `DraggableList` sets
 * `data-bk-is-muted="true"` on blocks that aren't currently published (e.g. a
 * future `publishOn` schedule) or hidden by their visibility options.
 */
export async function isBlockMuted(page: Page, uuid: string): Promise<boolean> {
  const muted = await page
    .locator(`[data-bk-uuid="${uuid}"]`)
    .getAttribute('data-bk-is-muted')
  return muted === 'true'
}

/**
 * Add a block programmatically — the cheap way to get a real mutation when a
 * test just needs pending changes (most do). This runs the same adapter call
 * the agent's add tools and the add-list drop handler use
 * (`state.mutateWithLoadingState(() => adapter.addNewBlock(...))`), so it
 * produces a genuine mutation + history entry — without the canvas drag, the
 * add-list, or the editable-overlay that a real drop opens.
 *
 * Defaults to a `text` block in the host entity's `content` field. To nest a
 * block inside another block's field, pass `hostUuid` (the parent block's uuid)
 * + the parent's `fieldName` — the host entity type/uuid are resolved from the
 * registered field, so this works at any nesting level. For testing the drag
 * gesture itself, use `dragNewBlockIntoPage` instead. Resolves with the new
 * block's uuid (diffed from the document before/after the mutation).
 */
export function addBlock(
  page: Page,
  opts: { bundle?: string; fieldName?: string; hostUuid?: string } = {},
): Promise<string | null> {
  return page.evaluate(
    async ({ bundle, fieldName, hostUuid }) => {
      const app = window.__BLOKKLI__!.app!

      let host: { type: string; uuid: string; fieldName: string }
      if (hostUuid) {
        // Nesting: resolve the host entity type/uuid from the parent block's
        // registered field.
        const field = app.fields.find(hostUuid, fieldName)
        if (!field) {
          throw new Error(
            `Field "${fieldName}" not registered on block ${hostUuid}`,
          )
        }
        host = {
          type: field.hostEntityType,
          uuid: field.hostEntityUuid,
          fieldName,
        }
      } else {
        host = {
          type: app.context.value.entityType,
          uuid: app.context.value.entityUuid,
          fieldName,
        }
      }

      const before = new Set(app.state.getAllUuids())
      await app.state.mutateWithLoadingState(() =>
        app.adapter.addNewBlock({ bundle, host, afterUuid: null }),
      )
      return app.state.getAllUuids().find((uuid) => !before.has(uuid)) ?? null
    },
    {
      bundle: opts.bundle ?? 'text',
      fieldName: opts.fieldName ?? 'content',
      hostUuid: opts.hostUuid,
    },
  )
}

/**
 * A block to add via `addBlocks`. `uuid` is caller-provided (so the test knows
 * each block's id up front); `children` nests blocks keyed by the parent's
 * block-field name (e.g. `header`, `blocks`), recursively.
 */
export type NewBlockTree = {
  bundle: string
  uuid: string
  children?: Record<string, NewBlockTree[]>
}

/**
 * Add a whole tree of blocks in a single mutation — the same `adapter.addNewBlocks`
 * call the agent's `add_paragraphs` tool uses, which inserts nested structures
 * (and several top-level blocks) at once. Unlike `addBlock`, the caller supplies
 * each block's `uuid`, so the resulting document layout is fully known to the
 * test. Adds to the host entity's `content` field by default; pass `hostUuid` +
 * `fieldName` to target another entity's field.
 */
export function addBlocks(
  page: Page,
  blocks: NewBlockTree[],
  opts: {
    fieldName?: string
    hostUuid?: string
    afterUuid?: string | null
  } = {},
): Promise<void> {
  return page.evaluate(
    async ({ blocks, fieldName, hostUuid, afterUuid }) => {
      const app = window.__BLOKKLI__!.app!

      type EventBlock = {
        bundle: string
        blockUuid: string
        children?: Record<string, EventBlock[]>
      }
      const toEventBlocks = (nodes: typeof blocks): EventBlock[] =>
        nodes.map((node) => ({
          bundle: node.bundle,
          blockUuid: node.uuid,
          children: node.children
            ? Object.fromEntries(
                Object.entries(node.children).map(([field, children]) => [
                  field,
                  toEventBlocks(children),
                ]),
              )
            : undefined,
        }))

      let host: { type: string; uuid: string; fieldName: string }
      if (hostUuid) {
        const field = app.fields.find(hostUuid, fieldName)
        if (!field) {
          throw new Error(
            `Field "${fieldName}" not registered on block ${hostUuid}`,
          )
        }
        host = {
          type: field.hostEntityType,
          uuid: field.hostEntityUuid,
          fieldName,
        }
      } else {
        host = {
          type: app.context.value.entityType,
          uuid: app.context.value.entityUuid,
          fieldName,
        }
      }

      await app.state.mutateWithLoadingState(() =>
        app.adapter.addNewBlocks!({
          blocks: toEventBlocks(blocks),
          host,
          afterUuid: afterUuid ?? null,
        }),
      )
    },
    {
      blocks,
      fieldName: opts.fieldName ?? 'content',
      hostUuid: opts.hostUuid,
      afterUuid: opts.afterUuid ?? null,
    },
  )
}

/**
 * Place an add-list *action* (e.g. `fragment`, `library`, `template`) on a field
 * by emitting the `dragging:drop` event the dragging-overlay's drop dispatcher
 * consumes — the same path a real pointer drop takes, minus the brittle canvas
 * gesture. The action is read live from `app.plugins.get('addAction')` (so it's
 * never hardcoded), and the add-list's `defineDropHandler('action')` runs its
 * `callback(ActionPlacedData)` — typically opening the action's form overlay.
 *
 * Defaults to the host entity's `content` field at the start (`preceedingUuid`
 * null); pass `preceedingUuid` to insert after an existing block, or `fieldName`
 * to target another field.
 */
export function dropAddAction(
  page: Page,
  actionId: string,
  opts: { fieldName?: string; preceedingUuid?: string | null } = {},
): Promise<void> {
  return page.evaluate(
    ({ actionId, fieldName, preceedingUuid }) => {
      const app = window.__BLOKKLI__!.app!
      const action = app.plugins
        .get('addAction')
        .find((candidate) => candidate.id === actionId)
      if (!action) {
        throw new Error(`Add action "${actionId}" is not registered.`)
      }

      const ctx = app.context.value
      const field = app.fields.find(ctx.entityUuid, fieldName)
      if (!field) {
        throw new Error(
          `The host entity has no registered "${fieldName}" field.`,
        )
      }

      app.eventBus.emit('dragging:drop', {
        items: [
          {
            itemType: 'action',
            action,
            actionType: action.id,
            itemBundle: action.itemBundle,
            element: () => document.body,
          },
        ],
        field,
        host: {
          type: ctx.entityType,
          uuid: ctx.entityUuid,
          fieldName,
        },
        preceedingUuid,
      })
    },
    {
      actionId,
      fieldName: opts.fieldName ?? 'content',
      preceedingUuid: opts.preceedingUuid ?? null,
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
 * Where to drop a dragged block. Defaults to the start of the host entity's
 * `content` field; pass `fieldName`/`entityUuid` to target another field, or
 * `block`/`position` to insert relative to an existing block.
 */
export type DropTarget = {
  fieldName?: string
  entityUuid?: string
  block?: string
  position?: 'before' | 'after'
}

/**
 * Drag a new block of `bundle` from the add-list onto a drop slot via real
 * pointer input. Defaults to the start of the host entity's `content` field.
 *
 * The drop slots are WebGL-rendered and live in artboard coordinates, so
 * chasing their on-screen position is fragile — a slot anchored on a block
 * taller than the viewport (or scrolled off-screen) can land above y=0 and the
 * drop silently misses. Instead we let the editor place the target for us:
 *  1. Press the add-list rail item. The list is a ~50px rail but the item's
 *     rect reports its full expanded width, so clamp x to the rail width or the
 *     press lands on the canvas behind it.
 *  2. Arm the drag (`pointermove` > 7px while held) so the dragging overlay
 *     mounts and its `dragging:moveToDropTarget` listener registers.
 *  3. Emit `dragging:moveToDropTarget` — the overlay resolves the exact slot
 *     rect and centers it in the viewport.
 *  4. Carry the cursor to the viewport centre (where the slot now sits) and
 *     release. `active` is recomputed each render frame while the cursor moves
 *     and `mouse:up` reads it synchronously, so finish the movement *on* the
 *     centre (the final frame latches the slot) before releasing.
 */
export async function dragNewBlockIntoPage(
  page: Page,
  bundle: string,
  opts: DropTarget = {},
): Promise<void> {
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

  // Press the item and arm the drag (move > 7px while held).
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x, start.y + 12, { steps: 4 })

  // Ask the editor to centre the target drop slot in the viewport, then resolve
  // where the viewport centre is (the slot is now there).
  const center = await page.evaluate(
    ({ fieldName, entityUuid, block, position }) => {
      const app = window.__BLOKKLI__!.app!
      app.eventBus.emit(
        'dragging:moveToDropTarget',
        block
          ? { block, position: position ?? 'before' }
          : {
              host: entityUuid ?? app.context.value.entityUuid,
              fieldName: fieldName ?? 'content',
            },
      )
      const v = app.ui.viewport.value
      return { x: Math.round(v.width / 2), y: Math.round(v.height / 2) }
    },
    {
      fieldName: opts.fieldName,
      entityUuid: opts.entityUuid,
      block: opts.block,
      position: opts.position,
    },
  )

  // Let the (instant) centring settle, carry the cursor onto the slot, release.
  await nextFrames(page)
  await page.mouse.move(center.x, center.y, { steps: 12 })
  await nextFrames(page)
  await page.mouse.up()
}
