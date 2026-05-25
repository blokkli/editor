---
description: How blökkli's Playwright E2E tests work — run modes, the live-debugging workflow, test seams, helpers, and the canvas drag recipe. Use when writing, debugging, or running E2E tests.
---

# E2E Testing Skill

End-to-end tests drive the **real editor** in a browser via Vitest +
`@nuxt/test-utils/e2e` (which returns a Playwright `Page`). They exist to catch
the class of bug that unit tests and types can't: canvas-rendered UI, pointer
gestures, frame-timed drop logic, and DOM lifecycle.

- Specs: `test/e2e/*.test.ts`
- Shared helpers: `test/e2e/support/editor.ts`
- Shared `setup()` wrapper: `test/e2e/support/setup.ts`

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
  `applyFieldDiff`), assigned by the `test-cases` feature.

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

### Capturing an editor event without a window-global bridge

```ts
const opened = nextEditableOpen(page) // started, NOT awaited — listener is registered now
await dragNewBlockIntoPage(page, 'title')
expect(await opened).toBe('title')
```

`page.evaluate` returns a JS promise that resolves when an in-page promise
settles. Register the listener and hand back its result as one typed promise; do
not stash it on a `window` global.

### `data-test-*` attributes (stable selectors)

- Toolbar buttons (`PluginToolbarButton`): `data-test-toolbar-button="<id>"` →
  `toolbarButton(page, 'undo')` returns a `Locator` (click or assert
  `toBeDisabled()`).
- Popups (`Popup`): `data-test-popup="<id>"` on the container,
  `data-test-popup-close="<id>"` on the X → `popup(page, id)` /
  `dismissPopup(page, id)`.
- DiffApproval toolbar (a bespoke component, not toolbar buttons):
  `data-test="diff-approval-cancel|diff-approval-apply"`.

Prefer adding an id-valued `data-test-*` to a shared component over matching
mangled `bk-*` classes (Tailwind utility classes are renamed at build time).

## Key helpers (`support/editor.ts`)

- `openEditor(path?)` — `createPage`, pre-dismiss the `agent`/`tour` popups via
  localStorage (before nav — they overlay the toolbar otherwise), goto, wait for
  `__BLOKKLI__.app` and for the `z-init-overlay` to detach.
- `withApp`, `nextEditableOpen`, `blockCount`, `getHostContext`.
- `toolbarButton`, `popup`, `dismissPopup`, `plaintextEditor` (the
  `#bk-editable-field-textarea` that a plaintext editable mounts + focuses).
- `dragNewBlockIntoPage(page, bundle, { fieldName='content', entityUuid? })` —
  the real drag (see below).
- Editable/diff helpers: `openEditableField`, `editableText`,
  `waitForEditableText`, `runDiffApproval`, `applyFieldDiff`, `cancelDiff`,
  `applyDiff`, `undo`.

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

## Gotchas

- `setup()` without `rootDir` builds the *module root* (Nuxt welcome page) — a
  false green. `setupEditorE2E()` handles this; don't hand-roll `setup()`.
- Dropping a block with `addBehaviour` opens its editable, whose overlay then
  **intercepts pointer input** — `page.keyboard.press('Escape')` before another
  drag. One drag per test sidesteps it.
- Canvas double-click to edit is unreliable (artboard vs screen coords); drive
  `eventBus.emit('editable:open', { fieldName, uuid? })` instead.
- E2E timeouts are bumped in `vitest.config.ts` (prod build + hydration).
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
