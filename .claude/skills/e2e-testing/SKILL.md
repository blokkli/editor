---
description:
  blökkli Playwright E2E tests against Drupal sandboxes (`test/e2e-drupal/`) —
  shared-page pattern, `data-test` contract, helpers, canvas drag, cleanup
  checklist. Use when writing, debugging, or running E2E tests.
---

# E2E Testing Skill

Vitest + `@nuxt/test-utils/e2e` driving a real Playwright `Page` against the
live editor, on a sandbox of the ddev site: the Drupal adapter, and Drupal
stores every mutation. Catches what unit tests can't: canvas, pointer gestures,
frame-timed drop logic, DOM lifecycle.

- Specs: `test/e2e-drupal/*.test.ts`, feature specs under
  `test/e2e-drupal/features/*/`.
- Helpers: `test/e2e-drupal/support/` (no barrel — import direct from each
  module). Modules: `session`, `sandbox`, `mutations`, `blocks`, `editable`,
  `diff`, `events`, `toolbar`, `menu`, `sidebar`, `overlays`, `options`,
  `preview`, `schedule`, `selection`, `clipboard`, `bundleSelector`, `history`,
  `itemActions`, `keyboard`, `translations`, `agent`, `charts`,
  `complexOptions`.
- Fixtures: `test/e2e-drupal/content` (see "Fixtures" below).

For the agent's tests (`features/agent/`) see `/agent-e2e-testing` — covers the
`tools/` (call one tool, no LLM) vs full-flow (drive the loop via the mock LLM
provider) split, the mock script grammar, and the agent-specific support
helpers.

**Extract to `support/` when used by 2+ files** (and refactor existing callers
onto it — don't leave a copy behind). One-file-only helpers stay local.

## Running

On the host, with ddev running: `bun run test:e2e-drupal [files]`, or
`bun run verify -- e2e-drupal`. How the sandboxes, their template and the fakes
for DeepL and the agent work: the `sandbox` skill, "E2E tests".

To debug, reproduce in a sandbox of your own
(`ddev drush blokkli-sandbox:create a1`, then
`ddev drush uli --uri=https://a1.blokkli.ddev.site`) instead of looping the
test, then lock the recipe into a spec.

## Page lifecycle: share, don't reopen

**One editor page per file.** Opening the editor costs a login and a full
hydration (`__BLOKKLI__.app` mount + `[data-test="init-overlay"]` detach). 6
tests × open = seconds wasted vs one `beforeAll`.

```ts
describe('Something', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    /* cheap reset, see checklist */
  })
})
```

**Each spec file resets its sandbox in `beforeAll`.** Between the tests of a
file, state carries over. A reset ends the session: close the page before it and
open a new one after it.

**Make accumulating state harmless** one of two ways:

1. **`addBlock` per test, find by uuid-diff** —
   `uuidsAfter.find(u => !uuidsBefore.includes(u))`. Selection isn't reliably
   replaced on shared pages.
2. **Shared fixture, different axes per test** — one seeded widget, each test
   mutates a different option key. See `features/options/mutations.test.ts`.

**Parallel pages when state can't be reset cheaply.** Permissions, the published
status and schedules are read once at editor init. Open the variants in parallel
in `beforeAll` — another user, or another seeded node — and clean them in
parallel in `afterEach`. See `features/delete`, `duplicate`, `entity-title`,
`publish`.

**Test ordering matters.** State-flipping tests (`takeOwnership`, submitting a
`publishOn` that changes a dialog default) run LAST in their page. Comment why
so reorder-by-mistake doesn't break it.

## Per-test reset checklist

`afterEach` must restore anything that's not auto-cleared:

| State                                                                                   | Reset                                                                                         |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Selection                                                                               | `emitEvent(page, 'select:unselect')`                                                          |
| Form overlay / dialog                                                                   | `closeFormOverlay(page, id)` or `emitEvent(page, 'overlay:close')`                            |
| Toast (6.1s timer, intercepts bottom-toolbar clicks)                                    | `dismissMessages(page)`                                                                       |
| Lingering drag                                                                          | `if (await withApp(page, a => a.selection.isDragging.value)) emitEvent(page, 'dragging:end')` |
| App menu                                                                                | `closeAppMenu(page)`                                                                          |
| `BlokkliTransition` leave-DOM ghost (e.g. `BundleSelector` via `caret-tooltip`, ~150ms) | `loc.waitFor({ state: 'detached' })`                                                          |

### Reset without reloading

`page.reload()` re-hydrates the editor. Almost always wrong.

- **The edit state's mutations:** `revertAllChanges(page)` discards them (the
  editor's "Discard"), a round trip instead of a reset and a new login.
- **Feature localStorage** (e.g. `blokkli:commentsShowResolved:<context>`,
  `blokkli:commandPaletteFrequency`) — clear the keys; reload only if read at
  mount.
- **Per-language tests**: open the translation's path directly
  (`editorPath('/de/bibliothek', 'translated')`). The "forbidden in translating
  mode" comment refers to the UI add-list — `addBlock` (adapter call) works in
  any language.

## Test seams: `window.__BLOKKLI__`

- **`.app`** — full `BlokkliApp` from `useBlokkli()`. Drive and assert.
- **`.test`** — the API of the `test-cases` feature (below). Each case is a
  component inside the feature's `PluginSidebar`, so its API only registers once
  you `openSidebar(page, 'test-cases')`. `.test` is `{}` before that.

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

## What Drupal stored

`nextMutation(page, 'pbUpdateParagraphOption')` (`support/mutations.ts`) waits
for the next request of that mutation and returns its variables, typed by the
GraphQL operations; an optional filter waits for a matching one. Start it before
the action, await it after; then reload to see what Drupal stored. That nothing
was sent: `countMutations(page, name)` returns a counter of the mutation's
requests from then on. `storedFieldValue(page, uuid, field)` reads the raw value
the adapter supplies, not the rendered one.

## `data-test-*` — the DOM contract

**Specs select on `data-test-*` ONLY.** No ids, no `bk-*` classes (mangled), no
tag/role/text selectors, no `[class*="…"]` substrings. Need an element? Add a
`data-test` to the (shared) component. Legitimate non-`data-test` selectors:
`data-bk-uuid`, `data-bk-diff-active` (runtime contracts, never mangled),
`ins`/`del` (HTML diff inside contenteditable), CKEditor classes (third-party).

**Adding a `data-test` is the right move 90% of the time.** Real cases: shared
`BannerInner` action button → `data-test="banner-button"` (scoped at call site
to outer banner `data-test`); `Form/Toggle`'s `sr-only` input →
`data-test="form-toggle-input"`; row checkboxes →
`data-test="<feature>-row-checkbox"`; shared shells with several variants → one
fixed `data-test="<thing>-button"` disambiguated by parent scope. **Don't pick a
name that collides with prefix matchers** (`crumb-button`, not
`breadcrumb-button`, when parents are `[data-test^="breadcrumb-"]`).

Conventions: `data-test="<feature>-<thing>"`, parametrised by id where many
(`dialog-<id>`, `option-<property>`). Store assertable values in the attribute
(`data-test-scheduled-date="<ISO>"`) — visible text is locale-formatted.

**Boolean `:data-test-x="bool"` renders in BOTH states** — `false` serialises to
`"false"`, not dropped (only `null`/`undefined` drop). So `[data-test-x]`
matches either; assert exact: `getAttribute === 'true'`.

**Generic hooks on shared inputs — scope, don't parametrise.** Fixed
`data-test="textarea"` on `Form/Textarea`; disambiguate at call site:
`dialog(page, 'publish').locator('[data-test="textarea"]')`.

## Key helpers

- `openEditor(sandbox, user, path, { mockScript?, timezoneId?, localStorage? })`
  — logs the user in, pre-dismisses the `agent`/`tour` popups, always gives the
  agent a mock script (default `[]`; `[{ type: 'restore' }]` to test the restore
  of a conversation), waits for the editor.
- `openPage(sandbox, user, path)` — logs the user in and opens the path outside
  the editor, e.g. to check what visitors see.
- `editorPath('/en/blocks', 'blocks')` — a seeded node's path in the editor;
  `BLOCKS_EDITOR_PATH` is that one. `support/sandbox.ts` has the reset, the
  login path and `seedUuid()`.
- `claimEditState(sandbox, user, path)` — makes the user the owner of the node's
  edit state (they open the editor and close it).
- `waitForEditorReady(page)` — re-runnable after a test-driven `page.goto`.
- `withApp`, `setFixedTime`, `nextEditableOpen`, `blockCount`, `getHostContext`.
- `addBlock(page, { bundle, fieldName, entityUuid? })` → uuid. **The cheap way
  to get a pending mutation.** Use this, not `dragNewBlockIntoPage`, unless the
  drag gesture is what's under test. No canvas, no editable overlay to clean.
- `pageStructure(page, { rootField?, entityUuid? })` →
  `Array<{ bundle, props?, fields? }>`. The host entity's block tree,
  recursively, with editContext keys + non-content props filtered out (only
  primitive-typed props remain). Pair with `toMatchInlineSnapshot` to assert a
  whole post-mutation tree in one shot instead of N individual `expect`s.
- `toolbarButton`, `undo`, `openAppMenu`, `closeAppMenu`, `appMenuButton`,
  `openSidebar`, `dialog`, `dialogSubmit`, `closeFormOverlay`,
  `dismissMessages`, `plaintextEditor`.
- Editable/diff: `openEditableField`, `editableText`, `waitForEditableText`,
  `runDiffApproval`, `applyFieldDiff`, `applyDiff`, `cancelDiff`.
- `getPreviewFrame(page)` — preview iframe `Frame`, gated on hydration.
- `dragNewBlockIntoPage(page, bundle, { fieldName, entityUuid? })` — real
  pointer drag onto a canvas-rendered drop slot. Use ONLY when the drag gesture
  is what's under test (the helper encapsulates the gesture; for drop-handler
  logic alone, see `app.dragdrop.getDropHandler(...)` below).

Where a helper takes a field, it defaults to `field_paragraphs`.

## Assertions

- **Outcomes, not just events.** For `addBehaviour: 'editable:<field>'`, assert
  `plaintextEditor` is visible AND `document.activeElement`, not just that
  `editable:open` fired.
- **Real interactions over event-bus shortcuts** when the interaction is what's
  under test. Drag E2E surfaced a real `addBehaviour` race.
- **Locator is always truthy** — assert `await locator.count()` /
  `expect.poll(() => blockCount(page))`.
- **No translation dependencies.** Assert locale-independent facts: structure,
  `data-test-*` raw values, stable substrings (e.g. `'2026'`). Never read `$t`
  to build expected strings.
- **Waiting:** a change goes through Drupal, so `expect.poll`'s default second
  can be too short: wait for its mutation (`nextMutation`) before asserting.
  Options are stored when the paragraph is deselected (or an action runs); the
  editor and the preview have them before.
- **TRAP: not `@playwright/test`.** Web-first matchers DON'T EXIST —
  `expect(loc).toBeDisabled()` throws `Invalid Chai property`. Read state off
  the Locator and assert the boolean with `expect.poll`:
  ```ts
  await expect.poll(() => loc.isDisabled()).toBe(true)
  expect(await loc.isVisible()).toBe(true)
  ```
  To wait, use `loc.waitFor({ state: 'visible' | 'hidden' | 'detached' })`.

## The sandbox's content and users

- **Users** (`content/users.yml`, typed as `TestUser`): Anna Keller and Lea
  Steiner (`content_editor`), Marc Brunner (`reviewer`), Élodie Favre
  (`translator`), Jonas Weber (`restricted_editor`), Sara Gerber
  (`comment_reader`: a reviewer who may read comments but not post them) and
  David Meier (`comment_administrator`: a reviewer who administers comments,
  without the permissions to view or post them); these two roles come from the
  test module. All have an English UI. Whoever opens a node's editor first owns
  its edit state; another user gets a read-only editor. Test permissions with
  users of other roles: there are no permission overrides.
- **Drupal's names:** fields are `field_paragraphs`, `field_text`, …; bundles
  are the paragraph types.
- **Harmless choices:** a test that would run "whatever comes first" (the
  palette's first command, …) picks one by its ID: Drupal publishes or discards
  as readily as anything else.
- **Pinned dates** must be in the future: Drupal rejects a schedule less than 2
  minutes after its own time.
- **The content model:** a `page` allows neither `section` nor `call_to_action`,
  an `editorial` node does; only editorial and office nodes allow fragments (the
  front page, `home`, is editorial). While editing, a `page` always shows an H2
  ("Related topics"). Text fields are `frame`, string fields `plain`; a
  paragraph's `field_title` holds 255 characters at most. A converted paragraph
  gets a new UUID.
- **Media:** numeric IDs follow the order of creation; don't rely on them.
  Adding one through the adapter needs its ID: find it in the media library by
  its name (`mediaLibraryGetResults`, see `features/analyze/alt-text`).
- **Fixtures:** add what a spec needs to `test/e2e-drupal/content` when the spec
  comes, in the seed format (`sandbox/drupal/content/README.md`); the next run
  rebakes. Reuse a node whose content fits; changing one means running the specs
  that use its key. Give a paragraph a `key` to find it:
  `seedUuid('paragraph', key)` (media: `seedUuid('media', key)`, files in
  `content/files/`). For content the site doesn't allow, mark the entity
  `invalid: true` (e.g. `nodes/broken.yml`, a title in a gallery): the seed then
  skips its checks. A paragraph with plain values has no translation, even in a
  translated node (`nodes/notices.yml`); `outdated: [de]` flags a translation as
  outdated (`nodes/waste-collection.yml`). `deleted: true` on a user or node
  deletes it after seeding, leaving its comments without an author or its
  notifications without a page (`users.yml`: Nora Huber, `nodes/removed.yml`).
- **The widget** (`sandbox/frontend/app/components/Paragraph/Widget`): a
  paragraph type for the tests only. It has an option of every type, each value
  in a cell of its own (`data-test="widget-option-<key>"`), a `field_title`
  bound to an element, a `field_lead` that is only prop-mapped, and a
  `field_link` with a title (`field_link.title`). Only E2E sandboxes allow it,
  on pages. Seeded ones are on `nodes/widgets.yml`; `setupWidget(page)` adds
  one. A new option type goes here first.

## Gotchas

- Dropping a block with `addBehaviour` opens its editable, whose overlay
  intercepts pointer input. The text's frame editor has no Escape handler in the
  main document: close it with `saveByClickAway` (an unchanged overlay saves
  nothing). One drag per test sidesteps it.
- Canvas double-click to edit is unreliable (artboard vs screen coords) — use
  `eventBus.emit('editable:open', { fieldName, uuid? })`.
- **Drop logic without a canvas drop:**
  `app.dragdrop.getDropHandler('<itemType>')` returns the handler; you can
  `await handler.execute({ items, host, afterUuid, field, bundle })` in
  `withApp` to exercise drop logic (import, summary, mutation) without the
  canvas gesture. Use when the drag _gesture_ belongs to another feature. To
  assert the _decision_ to begin a drag, emit the trigger and read
  `app.selection.isDragging` / `dragItems` (then
  `emitEvent(page, 'dragging:end')`).
- **Deterministic time:** `setFixedTime(page, instant)` fakes only `Date`
  (rAF/timers keep running). Pair with `openEditor`'s `timezoneId: 'UTC'`.
  **TRAP**: a frozen `Date.now()` stalls the canvas drag (move throttling reads
  it) — pin AFTER any drag. Pick mid-month midday so TZ offsets can't shift
  "today".
- **`BundleSelector` search input swallows Escape** (`@keydown.capture.stop`
  kills it before the keyboard provider). To dismiss in cleanup, click
  `[data-test="artboard-tooltip-close"]` instead.
- Timeouts are tight: `testTimeout: 15s`, `hookTimeout: 30s` (the hooks reset
  sandboxes). If you're tempted to bump them, fix the underlying race — almost
  always the cleanup checklist above.
- **Responsive-preview iframe sync**: same-origin iframe (`?blokkliPreview`).
  Reach via
  `(await page.locator('[data-test="preview-iframe"]').elementHandle()).contentFrame()`,
  inspect with `frame.evaluate`. No `window.__BLOKKLI__` inside (preview mode);
  blocks identified by `[data-bk-uuid]`. Sync is `postMessage` from editor
  events. **TRAP**: blocks are SSR'd before the iframe hydrates, but the
  postMessage listener only registers on hydration — events emitted right after
  blocks appear can be dropped. Re-emit inside `expect.poll` with a generous
  timeout.
- Browser pinned by `playwright-core`. If missing:
  `node node_modules/playwright-core/cli.js install chromium chromium-headless-shell`.
  **Do NOT** `bunx playwright install chrome` (purges + needs sudo).

## The `test-cases` feature

`sandbox/frontend/blokkli/features/test-cases/` backs `.test`. It is `devOnly`:
the dev server has it, the hosted production build doesn't. Its scenarios name
the sandbox's fields (`field_lead`, `title.field_title`, `text.field_text`).

`index.vue` registers the feature + `PluginSidebar` + the
`window.__BLOKKLI__.test` lifecycle (assign on mount, delete on unmount). One
component per scenario under `cases/<Name>/index.vue`; each emits
`register({ ...api })` on mount. Specs must `openSidebar(page, 'test-cases')`
before `.test` is populated. Add a case = new `cases/<Name>/index.vue` + extend
`BlokkliTestApi` in `types.ts`. Don't grow `index.vue`.

## Typechecking

E2E specs span `src/runtime` AND the app's scaffolding (the `.test`
augmentation, the generated types), so they typecheck with the sandbox's
frontend: `test/e2e-drupal/tsconfig.json` references
`sandbox/frontend/.nuxt/tsconfig.app.json`, and
`sandbox/frontend/nuxt.config.ts` includes `../blokkli/features/**/*` and
`../../../test/e2e-drupal/**/*`. Covered by
`bun run typecheck:sandbox-frontend`.
