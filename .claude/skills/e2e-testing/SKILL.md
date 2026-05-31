---
description:
  blökkli Playwright E2E tests — shared-page pattern, `data-test` contract,
  helpers, canvas drag, cleanup checklist. Use when writing, debugging, or
  running E2E tests.
---

# E2E Testing Skill

Vitest + `@nuxt/test-utils/e2e` driving a real Playwright `Page` against the
live editor. Catches what unit tests can't: canvas, pointer gestures,
frame-timed drop logic, DOM lifecycle.

- Specs: `test/e2e/*.test.ts`, feature specs under `test/e2e/features/*/`.
- Helpers: `test/e2e/support/` (no barrel — import direct from each module).
  Modules: `session`, `blocks`, `editable`, `diff`, `events`, `toolbar`,
  `menu`, `sidebar`, `overlays`, `options`, `preview`, `recorder`, `schedule`,
  `selection`, `clipboard`, `bundleSelector`, `history`, `itemActions`,
  `keyboard`, `translations`, `setup`.

**Extract to `support/` when used by 2+ files** (and refactor existing callers
onto it — don't leave a copy behind). One-file-only helpers stay local.

## Running

`npm run test:e2e` against the playground at `http://localhost:3000`. Start
it yourself first: `npm run dev` (HMR) or `npm run dev:build && npm run dev:start`
(static, what the suite is tuned against). `setupEditorE2E()` does
`build=false; server=false`; always `await` it at the top of an async
`describe`.

**Debug with the Playwright MCP**, not the test loop — drive the running
playground via `browser_run_code_unsafe` / `browser_evaluate`. Lock the recipe
into a spec, then `npm run test:e2e`.

## Page lifecycle: share, don't reopen

**One editor page per file.** Every `page.goto` costs ~2.3s
(`__BLOKKLI__.app` mount + `[data-test="init-overlay"]` detach after
hydration). 6 tests × goto = ~14s wasted vs one `beforeAll`.

```ts
describe('My feature', async () => {
  await setupEditorE2E()
  let page: Page
  beforeAll(async () => { page = await openEditor('/page/1?blokkliEditing=1&testing=true') })
  afterAll(async () => { await page.close() })
  afterEach(async () => { /* cheap reset, see checklist */ })
})
```

**Make accumulating state harmless** one of two ways:

1. **`addBlock` per test, find by uuid-diff** —
   `uuidsAfter.find(u => !uuidsBefore.includes(u))`. Selection isn't
   reliably replaced on shared pages.
2. **Shared fixture, different axes per test** — one seeded widget, each
   test mutates a different option key. See `features/options/mutations.test.ts`.

**Parallel pages when state can't be reset cheaply.** Permission overrides
and entity-status seeds are read once at editor init. Open variants in
parallel in `beforeAll` (`defaultPage` + `denyPage`, etc.), clean both in
parallel in `afterEach`. See `features/delete`, `duplicate`, `entity-title`,
`publish`.

**Test ordering matters.** State-flipping tests (`takeOwnership`, submitting
a `publishOn` that changes a dialog default) run LAST in their page. Comment
why so reorder-by-mistake doesn't break it.

## Per-test reset checklist

`afterEach` must restore anything that's not auto-cleared:

| State | Reset |
| --- | --- |
| Selection | `emitEvent(page, 'select:unselect')` |
| Adapter recorder | `clearAdapterCalls(page)` (else `waitForAdapterCall` resolves on stale) |
| Form overlay / dialog | `closeFormOverlay(page, id)` or `emitEvent(page, 'overlay:close')` |
| Toast (6.1s timer, intercepts bottom-toolbar clicks) | `dismissMessages(page)` |
| Lingering drag | `if (await withApp(page, a => a.selection.isDragging.value)) emitEvent(page, 'dragging:end')` |
| App menu / popup | `closeAppMenu(page)`, `dismissPopup(page, id)` |
| `BlokkliTransition` leave-DOM ghost (e.g. `BundleSelector` via `caret-tooltip`, ~150ms) | `loc.waitFor({ state: 'detached' })` |

### Reset without reloading

`page.reload()` is ~2s AND re-hydrates the editor. Almost always wrong.

- **EditState mutations** persist to `__30_blokkli_mock_<uuid>_{mutations,index}`
  localStorage. `page.reload()` *keeps* them. Remove both keys + emit
  `reloadState` → ~200ms. See `features/history/base.test.ts`.
- **Feature localStorage** (e.g. `blokkli_playground_comments`,
  `blokkli:commentsShowResolved:<context>`, `blokkli:commandPaletteFrequency`)
  — clear the keys; reload only if read at mount.
- **Per-language tests**: open at `/de/page/1` directly. The "forbidden in
  translating mode" comment refers to the UI add-list — `addBlock` (adapter
  call) works in any language.

## Test seams: `window.__BLOKKLI__`

- **`.app`** — full `BlokkliApp` from `useBlokkli()`. Drive and assert.
- **`.test`** — playground-only API from the `test-cases` feature. Each case
  is a component inside the feature's `PluginSidebar`, so its API only
  registers once you `openSidebar(page, 'test-cases')`. `.test` is `{}`
  before that.

**Use `withApp(page, fn)`** for awaited reads/actions — `fn` gets a typed
`BlokkliApp` via JSHandle. No `window.__BLOKKLI__!.app!` casts; no local
re-declaration of the global.

```ts
const count = await withApp(page, (app) => app.state.getAllUuids().length)
```

For a listener registered before the action:

```ts
const opened = nextEditableOpen(page) // started, NOT awaited
await dragNewBlockIntoPage(page, 'title')
expect(await opened).toBe('title')
```

## Adapter recorder (`?testing=true`)

Open with `?testing=true` → mock adapter records selected calls to
`localStorage` (survives the publish reload that wipes `window` props).
`waitForAdapterCall(page, 'method')` resolves with args of the first match.

```ts
const args = await waitForAdapterCall<{ publishIfUnpublished?: boolean }>(page, 'publish')
```

Add new methods via `recordAdapterCall(...)` in
`playground/app/mock/blokkli.editAdapter.ts` (gated by `isTesting`).
Recorder source: `playground/app/mock/testRecorder.ts`.

Caveats:

- **First match wins.** For a 2nd call of the same method, poll the count,
  then take `.at(-1)`.
- **`undefined` is dropped** (JSON). A cleared field records as `{ uuid, type }`.
- **One submit can record extras** — e.g. scheduler clears the untouched
  section as a `null`. `.find()` by discriminator, don't assume length/order.

## `data-test-*` — the DOM contract

**Specs select on `data-test-*` ONLY.** No ids, no `bk-*` classes (mangled),
no tag/role/text selectors, no `[class*="…"]` substrings. Need an element?
Add a `data-test` to the (shared) component. Legitimate non-`data-test`
selectors: `data-bk-uuid`, `data-bk-diff-active` (runtime contracts, never
mangled), `ins`/`del` (HTML diff inside contenteditable), CKEditor classes
(third-party).

**Adding a `data-test` is the right move 90% of the time.** Real cases:
shared `BannerInner` action button → `data-test="banner-button"` (scoped at
call site to outer banner `data-test`); `Form/Toggle`'s `sr-only` input →
`data-test="form-toggle-input"`; row checkboxes → `data-test="<feature>-row-checkbox"`;
shared shells with several variants → one fixed `data-test="<thing>-button"`
disambiguated by parent scope. **Don't pick a name that collides with prefix
matchers** (`crumb-button`, not `breadcrumb-button`, when parents are
`[data-test^="breadcrumb-"]`).

Conventions: `data-test="<feature>-<thing>"`, parametrised by id where
many (`dialog-<id>`, `option-<property>`). Store assertable values in the
attribute (`data-test-scheduled-date="<ISO>"`) — visible text is
locale-formatted.

**Boolean `:data-test-x="bool"` renders in BOTH states** — `false`
serialises to `"false"`, not dropped (only `null`/`undefined` drop). So
`[data-test-x]` matches either; assert exact: `getAttribute === 'true'`.

**Generic hooks on shared inputs — scope, don't parametrise.** Fixed
`data-test="textarea"` on `Form/Textarea`; disambiguate at call site:
`dialog(page, 'publish').locator('[data-test="textarea"]')`.

## Key helpers

- `openEditor(path?, { timezoneId?, permissions?, localStorage? })` — opens,
  pre-dismisses `agent`/`tour` popups, waits for editor ready.
- `waitForEditorReady(page)` — re-runnable after a test-driven `page.goto`.
- `withApp`, `setFixedTime`, `nextEditableOpen`, `blockCount`, `getHostContext`.
- `addBlock(page, { bundle, fieldName, entityUuid? })` → uuid. **The cheap
  way to get a pending mutation.** Use this, not `dragNewBlockIntoPage`,
  unless the drag gesture is what's under test. No canvas, no editable
  overlay to clean.
- `toolbarButton`, `undo`, `openAppMenu`, `closeAppMenu`, `appMenuButton`,
  `openSidebar`, `popup`, `dismissPopup`, `dialog`, `dialogSubmit`,
  `dialogCancel`, `closeFormOverlay`, `dismissMessages`, `plaintextEditor`.
- `clearAdapterCalls`, `waitForAdapterCall`, `recordedAdapterCalls`.
- Editable/diff: `openEditableField`, `editableText`, `waitForEditableText`,
  `runDiffApproval`, `applyFieldDiff`, `applyDiff`, `cancelDiff`.
- `getPreviewFrame(page)` — preview iframe `Frame`, gated on hydration.
- `dragNewBlockIntoPage(page, bundle, { fieldName, entityUuid? })` — real
  pointer drag onto a canvas-rendered drop slot. Use ONLY when the drag
  gesture is what's under test (the helper encapsulates the gesture; for
  drop-handler logic alone, see `app.dragdrop.getDropHandler(...)` below).

## Assertions

- **Outcomes, not just events.** For `addBehaviour: 'editable:<field>'`,
  assert `plaintextEditor` is visible AND `document.activeElement`, not just
  that `editable:open` fired.
- **Real interactions over event-bus shortcuts** when the interaction is
  what's under test. Drag E2E surfaced a real `addBehaviour` race.
- **Locator is always truthy** — assert `await locator.count()` /
  `expect.poll(() => blockCount(page))`.
- **No translation dependencies.** Assert locale-independent facts:
  structure, `data-test-*` raw values, stable substrings (e.g. `'2026'`).
  Never read `$t` to build expected strings.
- **TRAP: not `@playwright/test`.** Web-first matchers DON'T EXIST —
  `expect(loc).toBeDisabled()` throws `Invalid Chai property`. Read state
  off the Locator and assert the boolean with `expect.poll`:
  ```ts
  await expect.poll(() => loc.isDisabled()).toBe(true)
  expect(await loc.isVisible()).toBe(true)
  ```
  To wait, use `loc.waitFor({ state: 'visible' | 'hidden' | 'detached' })`.

## Gotchas

- Dropping a block with `addBehaviour` opens its editable, whose overlay
  intercepts pointer input — `page.keyboard.press('Escape')` before another
  drag. One drag per test sidesteps it.
- Canvas double-click to edit is unreliable (artboard vs screen coords) —
  use `eventBus.emit('editable:open', { fieldName, uuid? })`.
- **Drop logic without a canvas drop:**
  `app.dragdrop.getDropHandler('<itemType>')` returns the handler; you can
  `await handler.execute({ items, host, afterUuid, field, bundle })` in
  `withApp` to exercise drop logic (import, summary, mutation) without the
  canvas gesture. Use when the drag *gesture* belongs to another feature.
  To assert the *decision* to begin a drag, emit the trigger and read
  `app.selection.isDragging` / `dragItems` (then `emitEvent(page, 'dragging:end')`).
- **Deterministic time:** `setFixedTime(page, instant)` fakes only `Date`
  (rAF/timers keep running). Pair with `openEditor(path, { timezoneId: 'UTC' })`.
  **TRAP**: a frozen `Date.now()` stalls the canvas drag (move throttling
  reads it) — pin AFTER any drag. Pick mid-month midday so TZ offsets can't
  shift "today".
- **`BundleSelector` search input swallows Escape** (`@keydown.capture.stop`
  kills it before the keyboard provider). To dismiss in cleanup, click
  `[data-test="artboard-tooltip-close"]` instead.
- Timeouts are tight: `testTimeout: 15s`, `hookTimeout: 15s`. If you're
  tempted to bump them, fix the underlying race — almost always the cleanup
  checklist above.
- **Responsive-preview iframe sync**: same-origin iframe (`?blokkliPreview`).
  Reach via `(await page.locator('[data-test="preview-iframe"]').elementHandle()).contentFrame()`,
  inspect with `frame.evaluate`. No `window.__BLOKKLI__` inside (preview
  mode); blocks identified by `[data-bk-uuid]`. Sync is `postMessage` from
  editor events. **TRAP**: blocks are SSR'd before the iframe hydrates, but
  the postMessage listener only registers on hydration — events emitted
  right after blocks appear can be dropped. Re-emit inside `expect.poll`
  with a generous timeout.
- Browser pinned by `playwright-core`. If missing: 
  `node node_modules/playwright-core/cli.js install chromium chromium-headless-shell`.
  **Do NOT** `npx playwright install chrome` (purges + needs sudo).

## The `test-cases` playground feature

`playground/blokkli/features/test-cases/` backs `.test`. `index.vue`
registers the feature + `PluginSidebar` + the `window.__BLOKKLI__.test`
lifecycle (assign on mount, delete on unmount). One component per scenario
under `cases/<Name>/index.vue`; each emits `register({ ...api })` on mount.
Specs must `openSidebar(page, 'test-cases')` before `.test` is populated.
Add a case = new `cases/<Name>/index.vue` + extend `BlokkliTestApi` in
`types.ts`. Don't grow `index.vue`.

## Typechecking

E2E specs span `src/runtime` AND playground scaffolding (the `.test`
augmentation). `test/e2e/tsconfig.json` references
`playground/.nuxt/tsconfig.app.json`; `playground/nuxt.config.ts` includes
`../../test/e2e/**/*` and `../blokkli/features/**/*`. Covered by
`npm run typecheck:playground`.
