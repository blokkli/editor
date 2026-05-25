---
description: How blökkli's Playwright E2E tests work — run modes, the live-debugging workflow, test seams, helpers, and the canvas drag recipe. Use when writing, debugging, or running E2E tests.
---

# E2E Testing Skill

End-to-end tests drive the **real editor** in a browser via Vitest +
`@nuxt/test-utils/e2e` (which returns a Playwright `Page`). They exist to catch
the class of bug that unit tests and types can't: canvas-rendered UI, pointer
gestures, frame-timed drop logic, and DOM lifecycle.

- Specs: `test/e2e/*.test.ts`; feature-specific specs live in
  `test/e2e/features/*.test.ts` (anything testing one editor feature goes there).
- Shared helpers: `test/e2e/support/`, split by subsystem, one module each —
  import directly from the relevant module (`from './support/session'`,
  `from './support/diff'`, …; there is no barrel). The modules: `session` (open
  the editor + `withApp`), `blocks` (state + the canvas drag), `editable`,
  `diff`, `toolbar`, `menu`, `sidebar`, `overlays` (popups + modal dialogs),
  `recorder` (assert which adapter calls a flow made), and `setup` (the
  host-aware `setup()` wrapper).

## Running tests — two modes

| Command | Mode | Speed | When |
| --- | --- | --- | --- |
| `npm run test:e2e` | Hermetic production build | ~30–40s | CI / source of truth |
| `npm run test:e2e:dev` | Against the **running** `npm run dev` | ~13s | Local dev loop |

`setupEditorE2E()` picks the mode from the `E2E_HOST` env var: when set (e.g.
`http://localhost:3000`), `@nuxt/test-utils` does `build=false; server=false` and
points specs at the already-running dev server — no per-run build. Always call
`await setupEditorE2E()` at the **top of an async `describe`** (it registers its
own hooks; in `beforeAll` the build never runs).

```ts
describe('My feature', async () => {
  await setupEditorE2E()
  test('...', async () => {
    const page = await openEditor()
    // ...
    await page.close()
  })
})
```

## Developing/debugging a test — use the Playwright MCP, not the build loop

The build-mode loop is too slow to *develop* against. Instead, drive the
**running dev server** with the Playwright MCP plugin (configured to the
`chromium` channel at `/usr/bin/chromium`). `browser_run_code_unsafe` gives raw
`page.mouse`/`page.evaluate` for live experimentation; `browser_evaluate` for
quick state inspection. This is how the whole canvas drag recipe was
reverse-engineered — seconds per iteration, full access to live editor state.
Lock the proven recipe into a spec, then confirm once with `npm run test:e2e`.

## Test seams: `window.__BLOKKLI__`

The editor exposes itself on `window.__BLOKKLI__` (see
`useGlobalBlokkliObject` / `EditProvider`):

- **`.app`** — the full `BlokkliApp` from `useBlokkli()` (state, eventBus,
  blocks, dom, ui, selection, directive, …). Drive *and* assert against it.
- **`.test`** — playground-only imperative API (`runDiffApproval`,
  `applyFieldDiff`), assigned by the `test-cases` feature. **Each case is a
  component inside the feature's `PluginSidebar`, which only mounts its content
  while its pane is active — so a case's API isn't registered until you
  `openSidebar(page, 'test-cases')`.** `.test` exists as an empty `{}` before
  that, so the `diff` helpers wait for the actual function, not just `.test`
  being truthy.

> TODO (tracked in code): both are currently exposed unconditionally so E2E can
> run against a production build. Re-gate behind `import.meta.dev` once E2E runs
> in dev mode.

### `withApp` — the way to touch the app (no `window.__BLOKKLI__!.app!` casts)

```ts
const count = await withApp(page, (app) => app.state.getAllUuids().length)
```

`withApp(page, fn)` waits for the editor, then passes the typed `BlokkliApp` to
`fn` via a `JSHandle` argument. `fn` is serialized and runs in the browser, so it
must be self-contained (no Node closures) — `app` is its only input. Use it for
awaited one-shot reads/actions. **Do not** re-declare `window.__BLOKKLI__`
locally or sprinkle `as unknown as {...}` casts — the real augmentations are in
scope (see Typechecking).

### Asserting adapter calls (the `?testing=true` recorder)

To verify a UI flow invoked the right adapter method with the right payload
(e.g. the publish dialog's save/publish/schedule modes), open the editor with
`?testing=true`. The mock adapter then records selected mutation calls, and
`waitForAdapterCall(page, 'publish')` resolves with that call's args:

```ts
const page = await openEditor('/page/1?blokkliEditing=1&testing=true')
// ...drive the flow, click submit...
const args = await waitForAdapterCall<{ publishIfUnpublished?: boolean }>(page, 'publish')
expect(args.publishIfUnpublished).toBe(false)
```

Records go to **`localStorage`**, not a `window` object, deliberately: a
successful publish reloads the page (`window.location.href = route.path`), which
would wipe a window property before the test reads it — `localStorage` survives.
To record a new method, add `recordAdapterCall('name', args)` (gated by the
adapter's `isTesting`) in `playground/app/mock/blokkli.editAdapter.ts`; the
recorder + shared storage key live in `playground/app/mock/testRecorder.ts`.

### Capturing an editor event without a window-global bridge

```ts
const opened = nextEditableOpen(page) // started, NOT awaited — listener is registered now
await dragNewBlockIntoPage(page, 'title')
expect(await opened).toBe('title')
```

`page.evaluate` returns a JS promise that resolves when an in-page promise
settles. Register the listener and hand back its result as one typed promise; do
not stash it on a `window` global.

### `data-test-*` attributes — the DOM contract

**Specs select on `data-test-*` ONLY.** No ids, no `bk-*` classes (mangled at
build), no tag/role/text selectors. If you need to reach an element, add a
`data-test` to the (shared) component — don't reach for a CSS/id selector. This
is the stable contract between the editor's DOM and the tests.

Existing hooks (extend this list as you add them):

- Toolbar buttons (`PluginToolbarButton`): `data-test-toolbar-button="<id>"` →
  `toolbarButton(page, 'undo')`.
- App-menu toggle (`Toolbar`) + buttons (`AppMenu/MenuButton`):
  `data-test="app-menu-toggle"` and `data-test="app-menu-button-<id>"` →
  `openAppMenu(page)` / `appMenuButton(page, id)`.
- Popups (`Popup`): `data-test-popup="<id>"` + `data-test-popup-close="<id>"` →
  `popup(page, id)` / `dismissPopup(page, id)`.
- Modal dialogs (`DialogModal`): `data-test="dialog-<id>"` on the container,
  `data-test="dialog-submit"` / `data-test="dialog-cancel"` on its buttons →
  `dialog(page, id)` / `dialogSubmit(page)` / `dialogCancel(page)`.
- Publish dialog: `data-test="publish-mode-<save|immediate|scheduled>"` (with
  `data-test-checked` reflecting selection); scheduler `data-test="schedule-date"`,
  `"schedule-time"`, `"schedule-error"`, and `"datepicker-day-<YYYY-MM-DD>"`; the
  revision-log message is the dialog's single `data-test="textarea"`.
- Toolbar scheduled-date (`entity-title`): `data-test="toolbar-scheduled-date"`
  with `data-test-scheduled-date="<ISO>"` (the raw instant — the visible text is
  locale-formatted, so assert against the attribute).
- DiffApproval toolbar: `data-test="diff-approval-cancel|diff-approval-apply"`.

A boolean `:data-test-x="bool"` renders the attribute only when `true` (Vue drops
`false`), so assert via `getAttribute(...) === 'true'`.

**Generic hooks on shared inputs — scope, don't parametrise.** For a shared
field component (e.g. `Form/Textarea`), add a *fixed* `data-test="textarea"` to
the element rather than threading an id-valued `data-test` prop through the
component's API (too much churn in core for a test seam). Disambiguate at the
call site by scoping to a container that already has a hook:
`dialog(page, 'publish').locator('[data-test="textarea"]')` (the publish dialog
has exactly one textarea, the revision-log message).

## Key helpers (`support/`, imported from their module)

- `openEditor(path?, { timezoneId? })` — `createPage`, pre-dismiss the
  `agent`/`tour` popups via localStorage (before nav — they overlay the toolbar
  otherwise), goto, wait for `__BLOKKLI__.app` and for the `z-init-overlay` to
  detach.
- `withApp`, `setFixedTime`, `nextEditableOpen`, `blockCount`, `getHostContext`.
- `toolbarButton`, `undo`, `openAppMenu`, `appMenuButton`, `openSidebar`,
  `popup`, `dismissPopup`, `dialog`, `dialogSubmit`, `dialogCancel`,
  `plaintextEditor` (the textarea a plaintext editable mounts + focuses).
- `addBlock(page, { bundle='text', fieldName='content', entityUuid? })` — add a
  block via a plain adapter mutation (the same `addNewBlock` call the agent tools
  and the add-list use). **This is the cheap way to get a pending mutation** —
  most tests just need *a* change (to enable Publish/Discard, etc.); reach for
  this, not the drag. No canvas, no editable overlay to clean up.
- `dragNewBlockIntoPage(page, bundle, { fieldName='content', entityUuid? })` —
  the real pointer drag (see below). Use ONLY when the drag gesture itself is
  what's under test.
- Editable/diff helpers: `openEditableField`, `editableText`,
  `waitForEditableText`, `runDiffApproval`, `applyFieldDiff`, `cancelDiff`,
  `applyDiff`.
- `waitForAdapterCall(page, method)` / `recordedAdapterCalls(page)` — assert a
  flow invoked the right adapter method with the right args (see below).

## The canvas drag recipe (`dragNewBlockIntoPage`)

Drop slots are canvas-rendered (no DOM). The recipe, derived purely from
already-exposed app API (no editor instrumentation):

1. **Press the add-list rail item.** The list is a ~50px rail but the item rect
   reports its full expanded width — clamp x to `addList.x + min(addList.w,
   item.w)/2` or you press the canvas behind it.
2. **Arm**: `pointerdown` then `pointermove` > 7px while held.
3. **Find an on-screen drop slot.** Big fields like `content` start off-screen,
   so pan the field's first block into view, then read its rect:
   - `app.eventBus.emit('scrollIntoView', { uuid, immediate: true })`, wait 2
     rAFs.
   - `app.dom.getBlockRect(uuid)` returns **artboard** coords;
     `app.ui.getViewportRelativeRect(rect)` converts to **screen** (zoom-correct
     — never assume scale=1). Drop on the block's top edge (`y+6`) =
     insert-before slot.
4. **Latch + release.** `active` (the drop target) is recomputed each render
   frame while the cursor *moves* and `mouse:up` reads it synchronously — so end
   the stepped movement *on* the slot (final frame latches it), then release. A
   jump-then-release drops nothing.

Block shape: `app.blocks.getBlock(uuid)` → `{ uuid, bundle, host: { type, uuid,
fieldName, bundle } }`.

## Writing good assertions

- **Assert outcomes, not just events.** For `addBehaviour: 'editable:<field>'`,
  assert the editor is genuinely open — `plaintextEditor(page)` is *visible* and
  is `document.activeElement` — not merely that `editable:open` fired.
- **Prefer real interactions over event-bus shortcuts** where the interaction is
  the thing under test. The drag E2E is what surfaced (and proved) a real
  `addBehaviour` race that a shortcut test would have hidden.
- A locator is always truthy: assert `await locator.count()` /
  `expect.poll(() => blockCount(page))`, never `expect(locator).toBeTruthy()`.
- **TRAP: these are Vitest tests, not `@playwright/test`.** The
  `expect(locator).toBeVisible()/toBeHidden()/toBeDisabled()/toBeEnabled()`
  web-first matchers DO NOT EXIST here — `expect(locator).toBeDisabled()` throws
  `Invalid Chai property`. Read state off the `Locator` and assert the boolean,
  retrying with `expect.poll` (Locator methods don't auto-retry like the
  matchers do):
  ```ts
  await expect.poll(() => loc.isDisabled()).toBe(true)   // not toBeDisabled()
  expect(await loc.isVisible()).toBe(true)               // not toBeVisible()
  ```
  To *wait* for appearance/disappearance use `loc.waitFor({ state: 'visible' |
  'hidden' })` (works for not-yet-rendered `v-if` elements too).

## Gotchas

- `setup()` without `rootDir` builds the *module root* (Nuxt welcome page) — a
  false green. `setupEditorE2E()` handles this; don't hand-roll `setup()`.
- Dropping a block with `addBehaviour` opens its editable, whose overlay then
  **intercepts pointer input** — `page.keyboard.press('Escape')` before another
  drag. One drag per test sidesteps it.
- Canvas double-click to edit is unreliable (artboard vs screen coords); drive
  `eventBus.emit('editable:open', { fieldName, uuid? })` instead.
- **Deterministic time:** `setFixedTime(page, instant)` fakes only `Date` (rAF
  and timers keep running, so transitions/canvas survive). Pair it with
  `openEditor(path, { timezoneId: 'UTC' })` so the instant maps to a known local
  date. **TRAP:** a frozen `Date.now()` stalls the canvas drag (its move
  throttling compares `Date.now()` deltas) — pin the clock *after* any drag,
  before the time-dependent UI reads the clock. Choose a mid-month, midday
  instant so timezone offsets can't shift "today".
- E2E timeouts are bumped in `vitest.config.ts` (prod build + hydration). Its
  e2e `include` is `test/e2e/**` (recurses into `features/`).
- Browser: the project's `playwright-core` pins a chromium revision. If browsers
  go missing, reinstall with `node node_modules/playwright-core/cli.js install
  chromium chromium-headless-shell` (pinned rev, no sudo). Do **not**
  `npx playwright install chrome` — it purges existing browsers and needs sudo.

## The `test-cases` playground feature

`playground/blokkli/features/test-cases/` backs the `.test` API. Keep it thin:

- `index.vue` — feature registration + the `PluginSidebar` + the single
  `window.__BLOKKLI__.test` lifecycle (assign on mount, delete on unmount). It
  merges each case's API fragment.
- `cases/<Name>/index.vue` — one self-contained component per scenario; renders
  its own trigger(s) and `emit('register', { ...api })` on mount.

Because the cases live inside the feature's `PluginSidebar`, their `register`
only fires once that sidebar is the active pane — so a spec must
`openSidebar(page, 'test-cases')` before using any `.test` method (the `diff`
helpers then wait for the specific function to appear).

Adding a case = new `cases/<Name>/index.vue` rendered in the shell with
`@register`, plus extend `BlokkliTestApi` in `types.ts`. Don't grow `index.vue`.

## Typechecking the tests

E2E specs span **src/runtime** *and* **playground** scaffolding (the `.test`
augmentation), so they get their own scope: `test/e2e/tsconfig.json` references
`playground/.nuxt/tsconfig.app.json`, and `playground/nuxt.config.ts` includes
`../../test/e2e/**/*` and `../blokkli/features/**/*`. They are covered by
`npm run typecheck:playground`. The `.test` namespace types come from the
playground module augmentation (`test-cases/global.d.ts`) — that's why the e2e
config must see the playground.
