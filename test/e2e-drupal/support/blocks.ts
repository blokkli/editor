import type { Page } from 'playwright-core'
import { withApp } from './session'
import { emitEvent } from './events'
// Pull the dragging-overlay's event-bus augmentation into the e2e TS program so
// `dragging:moveToDropTarget` is known here — feature files under `src/runtime`
// aren't otherwise part of the sandbox frontend's TS program. Type-only side
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

/** A block's rectangle in viewport coordinates, as the canvas hit-tests it. */
export function blockViewportRect(page: Page, uuid: string) {
  return page.evaluate((uuid) => {
    const app = window.__BLOKKLI__!.app!
    const rect = app.dom.getBlockRect(uuid, true)
    return rect ? app.ui.getViewportRelativeRect(rect) : null
  }, uuid)
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

/** What `addBlock` stores in the page, per call. */
type AddBlockOutcome = { uuid?: string | null; error?: string }

type AddBlockWindow = { __e2eAddBlock?: Map<number, AddBlockOutcome> }

let addBlockCalls = 0

/**
 * Add a block programmatically — the cheap way to get a real mutation when a
 * test just needs pending changes (most do). This runs the same adapter call
 * the agent's add tools and the add-list drop handler use
 * (`state.mutateWithLoadingState(() => adapter.addNewBlock(...))`), so it
 * produces a genuine mutation + history entry — without the canvas drag, the
 * add-list, or the editable-overlay that a real drop opens.
 *
 * Defaults to a `text` block in the host entity's `field_paragraphs` field. To nest a
 * block inside another block's field, pass `hostUuid` (the parent block's uuid)
 * + the parent's `fieldName` — the host entity type/uuid are resolved from the
 * registered field, so this works at any nesting level. For testing the drag
 * gesture itself, use `dragNewBlockIntoPage` instead. Resolves with the new
 * block's uuid (diffed from the document before/after the mutation).
 *
 * The mutation runs in the page, which stores its outcome; the test polls for
 * it. With a slow CPU (GitHub's runners), Chromium sometimes drops the promise
 * a `page.evaluate` waits on, although the mutation completes: "Promise was
 * collected", which Playwright reports as "Execution context was destroyed,
 * most likely because of a navigation".
 */
export async function addBlock(
  page: Page,
  opts: { bundle?: string; fieldName?: string; hostUuid?: string } = {},
): Promise<string | null> {
  const id = ++addBlockCalls
  await page.evaluate(
    ({ id, bundle, fieldName, hostUuid }) => {
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

      const outcomes = ((window as AddBlockWindow).__e2eAddBlock ??= new Map())
      const before = new Set(app.state.getAllUuids())
      app.state
        .mutateWithLoadingState(() =>
          app.adapter.addNewBlock({ bundle, host, afterUuid: null }),
        )
        .then(
          () => {
            outcomes.set(id, {
              uuid:
                app.state.getAllUuids().find((uuid) => !before.has(uuid)) ??
                null,
            })
          },
          (e) => {
            outcomes.set(id, { error: String(e) })
          },
        )
    },
    {
      id,
      bundle: opts.bundle ?? 'text',
      fieldName: opts.fieldName ?? 'field_paragraphs',
      hostUuid: opts.hostUuid,
    },
  )
  await page.waitForFunction(
    (id) => !!(window as AddBlockWindow).__e2eAddBlock?.has(id),
    id,
  )
  const outcome = await page.evaluate((id) => {
    const outcomes = (window as AddBlockWindow).__e2eAddBlock!
    const outcome = outcomes.get(id)!
    outcomes.delete(id)
    return outcome
  }, id)
  if (outcome.error) {
    throw new Error(`addBlock: ${outcome.error}`)
  }
  return outcome.uuid ?? null
}

/**
 * A snapshottable representation of one block: its bundle, its rendered
 * editable props (e.g. a title's `{ title, tagline, lead }`), and any nested
 * child blocks keyed by paragraph field name. Use with `toMatchInlineSnapshot`
 * to assert the entire post-mutation tree in one go instead of N individual
 * `expect`s.
 */
export type BlockTreeNode = {
  bundle: string
  props?: Record<string, unknown>
  fields?: Record<string, BlockTreeNode[]>
}

/**
 * Read the host entity's block tree under `rootField` (defaults to `field_paragraphs`)
 * and return a stable, JSON-serialisable shape suitable for inline snapshots.
 * Each node carries its bundle, non-empty props, and any child fields that
 * have blocks in them (empty child fields are omitted to keep snapshots
 * focused on what's actually there).
 *
 * Props come straight from `state.getFieldListItem(uuid).props` — the same
 * editable values the agent sets via `add_paragraphs`'s `contentFields`. To
 * snapshot a specific subtree, pass `entityUuid` (the uuid whose `rootField`
 * to walk) — defaults to the host entity.
 */
export function pageStructure(
  page: Page,
  opts: { rootField?: string; entityUuid?: string } = {},
): Promise<BlockTreeNode[]> {
  return page.evaluate(
    ({ rootField, entityUuid }) => {
      const app = window.__BLOKKLI__!.app!
      const fields = app.state.mutatedFields.value

      const byEntity = new Map<string, typeof fields>()
      for (const f of fields) {
        const list = byEntity.get(f.entityUuid) ?? []
        list.push(f)
        byEntity.set(f.entityUuid, list)
      }

      type Node = {
        bundle: string
        props?: Record<string, unknown>
        fields?: Record<string, Node[]>
      }

      function describe(uuid: string): Node {
        const item = app.state.getFieldListItem(uuid)
        const node: Node = { bundle: item?.bundle ?? '?' }
        if (item?.props) {
          // Only surface content-bearing props: strings, numbers, booleans.
          // Skips array props (field mappings — child blocks already appear
          // under `fields`), nested objects, undefined values, and the
          // editContext keys (`isNew`, `outdatedTranslations`) that
          // `getFieldListItem` merges in.
          const filtered: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(item.props)) {
            if (key === 'isNew' || key === 'outdatedTranslations') continue
            const t = typeof value
            if (t === 'string' || t === 'number' || t === 'boolean') {
              filtered[key] = value
            }
          }
          if (Object.keys(filtered).length) {
            node.props = filtered
          }
        }
        const children = (byEntity.get(uuid) ?? []).filter(
          (f) => f.list.length > 0,
        )
        if (children.length) {
          node.fields = Object.fromEntries(
            children.map((f) => [f.name, f.list.map((i) => describe(i.uuid))]),
          )
        }
        return node
      }

      const targetUuid = entityUuid || app.context.value.entityUuid
      const root = (byEntity.get(targetUuid) ?? []).find(
        (f) => f.name === rootField,
      )
      return (root?.list ?? []).map((i) => describe(i.uuid))
    },
    {
      rootField: opts.rootField ?? 'field_paragraphs',
      entityUuid: opts.entityUuid ?? '',
    },
  ) as Promise<BlockTreeNode[]>
}

/**
 * Place an add-list *action* (e.g. `fragment`, `library`, `template`) on a field
 * by emitting the `dragging:drop` event the dragging-overlay's drop dispatcher
 * consumes — the same path a real pointer drop takes, minus the brittle canvas
 * gesture. The action is read live from `app.plugins.get('addAction')` (so it's
 * never hardcoded), and the add-list's `defineDropHandler('action')` runs its
 * `callback(ActionPlacedData)` — typically opening the action's form overlay.
 *
 * Defaults to the host entity's `field_paragraphs` field at the start (`preceedingUuid`
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
      fieldName: opts.fieldName ?? 'field_paragraphs',
      preceedingUuid: opts.preceedingUuid ?? null,
    },
  )
}

/** Resolve after two animation frames — long enough for an instant artboard
 *  pan + re-render to settle so freshly-read rects reflect the new position. */
export function nextFrames(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
}

/**
 * Where to drop a dragged block. Defaults to the start of the host entity's
 * `field_paragraphs` field; pass `fieldName`/`entityUuid` to target another field, or
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
 * pointer input. Defaults to the start of the host entity's `field_paragraphs` field.
 *
 * The drop slots are WebGL-rendered and live in artboard coordinates, so
 * chasing their on-screen position is fragile — a slot anchored on a block
 * taller than the viewport (or scrolled off-screen) can land above y=0 and the
 * drop silently misses. Instead we let the editor place the target for us:
 *  1. Press the add-list rail item. The list is a ~50px rail but the item's
 *     rect reports its full expanded width, so clamp x to the rail width or the
 *     press lands on the canvas behind it. With more bundles than fit, the
 *     rail scrolls and its actions (e.g. templates) cover its bottom, so
 *     scroll the item to the middle first.
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
    const al = document
      .querySelector('[data-test="add-list"]')!
      .getBoundingClientRect()
    const element = document.querySelector(
      `[data-test="add-list-blocks"] [data-test="add-list-item-${b}"]`,
    )!
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
    const item = element.getBoundingClientRect()
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
              fieldName: fieldName ?? 'field_paragraphs',
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
