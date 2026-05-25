import { createPage, url } from '@nuxt/test-utils/e2e'
import type { JSHandle, Locator, Page } from 'playwright-core'
import type { BlokkliApp } from '../../../src/runtime/editor/types/app'
import type { EntityContext } from '../../../src/runtime/types'

// `window.__BLOKKLI__` is typed by its real augmentations, both pulled into
// scope by `test/e2e/tsconfig.json`: the global `Window` augmentation +
// `BlokkliGlobalWindowObject` (with `app`) from `useGlobalBlokkliObject`, and
// the playground's `test` namespace augmentation (test-cases `global.d.ts`).
// No local re-declaration — that would conflict with the real type.

/** Default playground editor route (entity `1`, edit mode on). */
export const EDITOR_PATH = '/page/1?blokkliEditing=1'

/**
 * Open the editor and wait until it has mounted and exposed its API on
 * `window.__BLOKKLI__.app`. Returns the Playwright page.
 *
 * Onboarding popups (the tour and the agent intro) are pre-dismissed via
 * localStorage before navigation — otherwise they overlay the bottom-right of
 * the editor and intercept clicks on the DiffApproval toolbar. The keys mirror
 * the `Popup` component's `popup:<id>:closed` storage (prefixed with `blokkli:`).
 */
export async function openEditor(path: string = EDITOR_PATH): Promise<Page> {
  const page = await createPage()
  await page.addInitScript(() => {
    localStorage.setItem('blokkli:popup:agent:closed', 'true')
    localStorage.setItem('blokkli:popup:tour:closed', 'true')
  })
  await page.goto(url(path), { waitUntil: 'hydration' })
  await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
  // Wait for the full-screen init/loading overlay (`z-init-overlay`) to fully
  // leave — until it detaches it covers the viewport and intercepts pointer
  // input. `.click()` auto-retries past it, but raw `page.mouse` drags do not.
  // The class is mangled (`_bk_z-init-overlay`), so match by substring.
  await page.waitForFunction(
    () => !document.querySelector('[class*="z-init-overlay"]'),
  )
  return page
}

/**
 * Run `fn` in the page with the resolved blökkli editor app, waiting for it to
 * be exposed first. The app is bridged in as a real argument (via a JSHandle),
 * so `fn` receives a fully-typed `BlokkliApp` — no `window.__BLOKKLI__!.app!`
 * boilerplate or casts at the call site.
 *
 * `fn` is serialized and runs in the browser, so it must be self-contained (no
 * Node closures) — `app` is its only input. It may return a value or a Promise;
 * the resolved value is returned. Use this for AWAITED one-shot reads/actions;
 * for a fire-before-the-action listener (`nextEditableOpen`) the registration
 * must be a single synchronous evaluate, so that one stays direct.
 */
export async function withApp<T>(
  page: Page,
  fn: (app: BlokkliApp) => T | Promise<T>,
): Promise<T> {
  await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
  const handle: JSHandle<BlokkliApp> = await page.evaluateHandle(
    () => window.__BLOKKLI__!.app!,
  )
  try {
    return await page.evaluate(fn, handle)
  } finally {
    await handle.dispose()
  }
}

/** The host entity's context (type/bundle/uuid), read from the live editor. */
export function getHostContext(page: Page): Promise<EntityContext> {
  return withApp(page, (app) => {
    const ctx = app.context.value
    return {
      type: ctx.entityType,
      bundle: ctx.entityBundle,
      uuid: ctx.entityUuid,
    }
  })
}

/**
 * Open a field's inline editor.
 *
 * Emits the `editable:open` event that the editable-field feature listens for —
 * the same event the canvas double-click ultimately fires. We drive it directly
 * rather than synthesizing a canvas pointer event because the canvas hit-test
 * (`getEditableAtPoint`) works in artboard coordinates (pan/zoom-transformed),
 * not screen space, so a `boundingBox`-based click is unreliable. Testing the
 * field's *behaviour* doesn't need real canvas hit-testing — that warrants its
 * own primitive with proper artboard-coordinate conversion.
 *
 * Pass `uuid` for a block field; omit it for a host-entity field.
 */
export function openEditableField(
  page: Page,
  fieldName: string,
  uuid?: string,
): Promise<void> {
  return page.evaluate(
    ({ fieldName, uuid }) => {
      window.__BLOKKLI__!.app!.eventBus.emit('editable:open', {
        fieldName,
        uuid,
      })
    },
    { fieldName, uuid },
  )
}

export interface EditableState {
  html: string
  text: string
  /** Whether the diff-preview attribute is set on the element. */
  diffActive: boolean
  /** Whether the element currently contains `<ins>`/`<del>` diff markup. */
  hasDiffMarkup: boolean
}

/** Read an editable's current DOM state — used to assert preview vs. clean. */
export function editableState(
  page: Page,
  fieldName: string,
  host: EntityContext,
): Promise<EditableState | null> {
  return page.evaluate(
    ({ fieldName, host }) => {
      const element = window.__BLOKKLI__!.app!.directive.findEditableElement(
        fieldName,
        host,
      )
      if (!element) {
        return null
      }
      return {
        html: element.innerHTML,
        text: element.textContent ?? '',
        diffActive: element.hasAttribute('data-bk-diff-active'),
        hasDiffMarkup: element.querySelector('ins, del') !== null,
      }
    },
    { fieldName, host },
  )
}

/**
 * Trigger the diff-approval test scenario (host title + lead + a card title).
 *
 * Returns a promise that resolves once the preview is applied or cancelled, so
 * tests can fire it, interact (assert markup, click apply/cancel), then await
 * the result:
 *
 * ```ts
 * const done = runDiffApproval(page)
 * // ...assert the diff markup is present...
 * await cancelDiff(page)
 * const { applied } = await done
 * ```
 */
export async function runDiffApproval(
  page: Page,
): Promise<{ applied: boolean }> {
  // The test API is assigned in the feature's onMounted, slightly after `app`.
  await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.test))
  return page.evaluate(() => window.__BLOKKLI__!.test!.runDiffApproval())
}

/**
 * Show a single-field diff whose apply performs a REAL mutation (persists
 * `value` via the adapter). Resolves on apply/cancel — fire, click apply, await.
 * Omit `uuid` for a host-entity field.
 */
export async function applyFieldDiff(
  page: Page,
  fieldName: string,
  value: string,
  uuid?: string,
): Promise<{ applied: boolean }> {
  await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.test))
  return page.evaluate(
    ({ fieldName, value, uuid }) =>
      window.__BLOKKLI__!.test!.applyFieldDiff({ fieldName, value, uuid }),
    { fieldName, value, uuid },
  )
}

/** Click the DiffApproval toolbar's Cancel button. */
export function cancelDiff(page: Page): Promise<void> {
  return page.locator('[data-test="diff-approval-cancel"]').click()
}

/** Click the DiffApproval toolbar's Apply button. */
export function applyDiff(page: Page): Promise<void> {
  return page.locator('[data-test="diff-approval-apply"]').click()
}

/**
 * Locate a toolbar button by its plugin `id` (the `id` prop of
 * `<PluginToolbarButton>`, surfaced as `data-test-toolbar-button`). Returns a
 * Playwright Locator, so callers can click it or assert its state, e.g.
 * `await expect(toolbarButton(page, 'undo')).toBeDisabled()`.
 */
export function toolbarButton(page: Page, id: string): Locator {
  return page.locator(`[data-test-toolbar-button="${id}"]`)
}

/**
 * Locate an onboarding popup by its `id` (the `id` prop of `<Popup>`, surfaced
 * as `data-test-popup`, e.g. `agent` or `tour`). Returns a Locator for presence
 * / visibility assertions.
 */
export function popup(page: Page, id: string): Locator {
  return page.locator(`[data-test-popup="${id}"]`)
}

/**
 * Dismiss a popup by clicking its close (X) button. Note `openEditor()` already
 * pre-dismisses the `agent` and `tour` popups via localStorage before they
 * render (popups only appear after a 1s delay), so this is for tests that
 * deliberately let a popup show and then exercise dismissing it.
 */
export function dismissPopup(page: Page, id: string): Promise<void> {
  return page.locator(`[data-test-popup-close="${id}"]`).click()
}

/**
 * Resolve with the `fieldName` of the next `editable:open` event.
 *
 * Call this BEFORE the action that triggers it and hold the promise (do not
 * await yet) — the in-page listener is registered synchronously when the
 * evaluate runs, and page commands serialize, so it's in place before any
 * subsequent interaction. Await the promise afterwards. This avoids stashing
 * the captured event on a `window` global (and the casts that come with it).
 */
export function nextEditableOpen(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        window.__BLOKKLI__!.app!.eventBus.on('editable:open', (e) =>
          resolve(e.fieldName),
        )
      }),
  )
}

/**
 * The open inline plaintext editable editor — the textarea the editable-field
 * feature mounts and focuses when a plaintext editable opens (e.g. the `title`
 * field). Wait for it with `.waitFor({ state: 'visible' })`; it is the active
 * element when open, so focus can be asserted via `document.activeElement`.
 */
export function plaintextEditor(page: Page): Locator {
  return page.locator('#bk-editable-field-textarea')
}

/** Press the editor's Undo toolbar button. */
export function undo(page: Page): Promise<void> {
  return toolbarButton(page, 'undo').click()
}

/** Read an editable field's current trimmed text. */
export async function editableText(
  page: Page,
  fieldName: string,
  host: EntityContext,
): Promise<string> {
  const state = await editableState(page, fieldName, host)
  return state?.text.trim() ?? ''
}

/** The number of blocks currently in the document (all fields). */
export function blockCount(page: Page): Promise<number> {
  return withApp(page, (app) => app.state.getAllUuids().length)
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

/** Wait until an editable field's trimmed text equals `expected`. */
export function waitForEditableText(
  page: Page,
  fieldName: string,
  host: EntityContext,
  expected: string,
): Promise<unknown> {
  return page.waitForFunction(
    ({ fieldName, host, expected }) => {
      const el = window.__BLOKKLI__!.app!.directive.findEditableElement(
        fieldName,
        host,
      )
      return !!el && el.textContent?.trim() === expected
    },
    { fieldName, host, expected },
  )
}
