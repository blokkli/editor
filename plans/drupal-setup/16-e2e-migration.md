# 16: Migrate the mock E2E specs to Drupal

- **Status:** in progress (the shared groundwork is done)

## Goal

The mock playground's E2E specs (`test/e2e/`) move to the Drupal suite
(`test/e2e-drupal/`), rewritten against its fixtures, so that the mock suite can
go one day (the user, 2026-10-08). A spec moves when the Drupal setup supports
what it tests; what only the mock can do stays in the mock suite for now.

The assessment below (2026-10-08) read every spec and checked its claims in the
code; nothing was run. "Unverified" marks what it couldn't confirm.

## Decisions

- **`window.__BLOKKLI__.test` comes to the sandbox frontend** (the user,
  2026-10-08): the playground's `test-cases` feature (`runAgentTool`,
  `runComponentTool`, `runDiffApproval`, `applyFieldDiff`, …), not mock scripts.
  Its sidebar also lets a person run cases that are otherwise hard to reproduce.
  Like the agent's `enableMock`, it must stay out of the hosted build.
- **What the tests need goes into the sandbox** (the user, 2026-10-08), see
  "Additions to the sandbox": demo changes that make sense for the site, and a
  test-only paragraph type, the widget, for every option type and the field
  combinations the demo has no use for (like the playground's `widget`). The
  option types matter for Drupal too: its behaviour plugin renders them.
- **The widget can't exist only in E2E sandboxes:** the sandbox frontend is one
  build, and its GraphQL documents are checked against the schema dumped from
  the dev site. So its paragraph type, fields and component are regular parts of
  the site, but no field of the demo allows it, so nobody can add it there
  (`content_editor` and `translator` bypass the per-type permissions, so a
  missing create permission wouldn't stop them). A test module, enabled only in
  E2E sandboxes, allows it in a field, and only the E2E fixtures contain
  widgets.
- **The sandbox frontend has its own copy of `test-cases`; the playground keeps
  its own until the mock suite goes** (2026-10-08). The scenarios name each
  app's fields, and `devOnly` can't differ per app: the playground's static
  build needs the feature, the hosted sandbox build must not have it. The
  sandbox's copy is `devOnly` (the E2E tests run against `nuxi dev`). The
  playground's stays for the processed-text tests that stay behind. New cases go
  into the sandbox's copy only.
- **Every E2E page has a mock script, also to test the restore of a
  conversation** (2026-10-08): a `{ type: 'restore' }` entry turns the
  auto-restore back on, instead of opening a page without a script. So no page
  can reach the model, even by mistake.
- **The Drupal suite typechecks with the sandbox frontend**
  (`typecheck:sandbox-frontend`, 2026-10-08): bundles, tools, `.test` and the
  GraphQL operations are those of the app it runs against.
- **Fixtures come with the specs that use them** (2026-10-08): each spec's entry
  below says what it needs, and a fixture's exact shape only becomes clear in
  its spec.

## How a spec moves

- **Where:** `test/e2e-drupal/features/<feature>/<name>.test.ts`, as in the mock
  suite. The mock spec (or the tests that moved out of it) is deleted once the
  Drupal version passes.
- **The adapter recorder** (`waitForAdapterCall`, `?testing=true`):
  `nextMutation(page, '<name>')` (`support/mutations.ts`) returns the next
  request's variables, typed; started before the action, awaited after. Then
  reload or reopen to see what Drupal stored. The items are shaped as in the
  schema (e.g. `{uuid, name, value, langcode}`).
- **Resetting the mock's localStorage between tests:** `revertAllChanges(page)`
  (`pbRevertAllChanges`, deletes the edit state; the new one belongs to whoever
  reverted). Or reset the sandbox and reopen.
- **Permission overrides:** a user with the right role. `restricted_editor`
  (Jonas) can't create or delete `chart` and `section`.
- **`.test`:** the same API, from the sandbox frontend's copy of the
  `test-cases` feature, so these specs keep their calls.
- **Ownership:** `canEdit` needs `currentUserIsOwner`. A second user on the same
  node gets a read-only editor: give each user their own node, or use that for
  the read-only tests. Edit states can't be seeded; the owner is whoever opens
  the editor first (in the code: loading the edit state creates it, and its
  `uid` defaults to the current user).
- **Media:** a seeded media's UUID is `seedUuid('media', key)`; numeric IDs
  follow the order of creation, don't rely on them. Files go in
  `test/e2e-drupal/content/files/`.
- **The agent's conversation restore:** the reading pages get
  `mockScript: [{ type: 'restore' }]`.
- **Pinned dates** must be in the future: Drupal rejects a schedule less than 2
  minutes after its time, and only unpublishes a paragraph whose date is after
  `time()`.
- **Content model:** a `page` doesn't allow `section` or `call_to_action`, an
  `editorial` node does; only editorial and office nodes allow fragments (the
  front page `home` is editorial). While editing, a `page` always shows an H2
  ("Related topics"). Text fields are `frame`, string fields `plain`; every
  paragraph `field_title` has a maximum length of 255. A converted paragraph
  gets a new UUID.

## Tasks

### Shared

- [x] Helpers in `test/e2e-drupal/support/`: `nextMutation`, `revertAllChanges`,
      `editorPath`, the `TestUser` type.
- [x] The `test-cases` feature in the sandbox frontend, `devOnly` (see
      "Decisions").
- [x] `openEditor` options: `localStorage` entries, `timezoneId`; the restore of
      a conversation through a `restore` script entry.
- [x] Users: Lea Steiner (a second content_editor), Marc Brunner (reviewer),
      Élodie Favre (translator), Jonas Weber (restricted_editor), all English.
- [x] Verify: whether opening the editor makes a user the edit state's owner
      (yes, see "How a spec moves"); whether seeded media get stable IDs (UUIDs
      from their keys).
- [ ] Fixtures, with the specs that use them (see "Decisions"):
  - a node with DE and FR translations (there: `nodes/translated.yml`), one with
    `outdated: [de]`, an unpublished one (`status: false`)
  - the editorial front page with fragments, an empty page, a long page
  - nestings: `columns` (`field_left`/`field_right`), `accordion`, `section`; a
    teaser with `field_title`/`field_lead` and a `field_link` to a node; a
    `call_to_action`; a `table`; a `chart`; a full `field_related` (3 teasers)
  - a node with two stored violations (`invalid: true`)
  - image media with and without alt, with files in
    `test/e2e-drupal/content/files/`
  - comment threads (resolved and unresolved, with mentions of Anna by another
    user), `templates.yml`, library items

### Additions to the sandbox

- [ ] **The widget** (test-only paragraph type, see "Decisions"):
  - options of every type: checkbox, checkboxes, radios (default with choice
    descriptions, icons, grid, colours), text, colour, range, number,
    datetime-local, an option group; new types are added here first
  - its component renders every option's value in a cell with a `data-test`
    (like the playground's widget), so the option specs keep their assertions
  - fields: a link with an editable title (cardinality 1, not droppable, not an
    entity mapping target, untranslatable), and a field bound to an element next
    to one without an element but with a `propsFieldMapping`; more as specs need
    them
  - in the GraphQL server config and the frontend's `paragraph` union; a test
    module allows it in `page.field_paragraphs` in E2E sandboxes
- [ ] Demo options:
  - Title: "Anchor" (text: one ID in every language, also used by the table of
    contents) and "In the table of contents" (checkbox), grouped as "Navigation"
  - Chart: "Height" (range), grouped with its width as "Format"
  - Teaser list: "Number of items" (number, replaces the hard-coded 3), and
    descriptions on its source choices
  - Call to action: a date (datetime-local), e.g. for the next municipal
    assembly; the seed needs dates relative to the bake in options
  - Group labels can't be translated (F56): "Navigation" and "Format" are the
    same in all three languages.
- [ ] `transfer blokkli paragraphs` for `content_editor` and `restricted_editor`
      (pasting a chart as Jonas then shows what was skipped).
- [ ] `call_to_action`: unpublish scheduling only (it promotes something with a
      deadline).
- [ ] Jonas (`restricted_editor`) loses `update paragraph content chart` ("may
      not add, change or delete charts"), after F55 is fixed. Update the welcome
      texts (EN/DE/FR), the sandbox skill and `CONTRIBUTING.md`.
- [ ] Élodie (`translator`) loses "take ownership": an edit state covers every
      language, so taking one over would hand her the editors' unfinished
      changes. A line in the welcome texts: she can't take over a page someone
      else is editing.
- [ ] The teaser maps its `field_title` and `field_lead` with
      `propsFieldMapping`, so changes to them preview live.
- [ ] A text filter for `basic_html` that marks external links
      (`target="_blank"` and a visually hidden "(opens in a new tab)"), after
      `filter_html`. It's what the mock's processing imitates.
- [ ] The seed: `deleted: true` on users and nodes, deleted after seeding (a
      comment by a deleted author, a notification whose page is gone).
- [ ] A fake for YouTube and Vimeo: a test module
      (`blokkli_playground/tests/modules/`) with an HTTP client middleware for
      the oEmbed providers list, the video data and the thumbnail. Installed by
      `bake-e2e`, and in the global setup's fingerprint.

### Agent (`features/agent/`)

- [x] `mock-scripts/conversation-restore`: done
      (`features/agent/conversation-restore.test.ts`, on
      `nodes/translated.yml`).
- [ ] `mock-scripts/full-flow`: done (`test/e2e-drupal/agent.test.ts`, "answers
      from its script"); delete it.
- [ ] `mock-scripts/grid-with-cards`: as is. grid/card become `columns`
      (`field_left` a title, `field_right` three texts); an empty page; the
      parent is the node's `field_paragraphs`; `pageStructure` with
      `rootField: 'field_paragraphs'`; a new snapshot.
- [ ] `mock-scripts/mode-context`: with changes. Read-only through another
      user's edit state, translating on the `/de` page.
- [ ] `mock-scripts/mode-guard`: with changes. Read-only as above; an empty
      page.
- [ ] `mock-scripts/ownership-flow`: with changes. Read-only as above;
      `pbTakeOwnership`.
- [ ] `mock-scripts/routing-autoload`: as is.
- [ ] `mock-scripts/selection-context`: as is, with three keyed texts in a
      fixture (`field_text` is required).
- [ ] `tools/add_paragraphs`: `.test`. `two_columns` > text becomes
      `columns.field_left` > text; three levels `accordion` > `columns` > text;
      child keys are field names.
- [ ] `tools/add_template`: `.test`. A seeded template (`columns` with two texts
      in `field_left`).
- [ ] `tools/auto_translate_paragraphs`: `.test`. The DeepL fake; wait for
      `pbBulkTranslateFieldValues` and reload `/de`; a `call_to_action` or a
      title instead of the card (`acceptedCount` changes).
- [ ] `tools/duplicate_paragraphs`: `.test`. Keyed `columns` > texts instead of
      made-up IDs.
- [ ] `tools/get_all_page_content`: `.test`. A teaser with title and lead
      (unverified: that `textFieldValues` has them).
- [ ] `tools/get_page_text`: `.test`. A node with a title, `field_lead` and
      title/text/teaser paragraphs; a new snapshot.
- [ ] `tools/processed-text`: splits. With the external-link filter, the 14
      markup tests move (seed external links in `field_text`). The 6 on plain
      strings stay: Drupal never processes those.
- [ ] `tools/update_text_fields`: `.test`. A title's `field_title` (plain, so
      the plaintext editor opens); assert after a reload.

### Translations, comments, publishing

- [ ] `translations/auto-translate`: with changes. A node with a translated
      title, opened at `/de`; seeded EN-only titles (adding while translating is
      unverified); the DeepL fake; `pbBulkTranslateFieldValues` and a reload.
      Tests 3–4 on the widget (a bound field and a props-mapped one).
- [ ] `translations/banner-and-switcher`: with changes. A DE translation, and a
      node with `outdated: [de]`; `pbClearOutdatedTranslation`; no banner after
      a reload.
- [ ] `translations/batch-translate`: with changes. Each test its own EN-only
      titles (about 12) and one EN-only text; row keys `<uuid>:field_title`; a
      paragraph with its own DE value for the preselection. Unverified: the
      rich-text test against Drupal's CKEditor frame.
- [ ] `translations/csv-export`: as is. EN-only titles, the editor in `/de`.
- [ ] `translations/csv-import`: with changes. As csv-export;
      `pbBulkTranslateFieldValues` and a reload.
- [ ] `translations/link-title`: on the widget's link with a title.
- [ ] `translations/link-title-translate`: stays (links are never translatable);
      a test for F58's fix replaces it.
- [ ] `comments/base`: with changes. Seeded threads, a second user. 10 of 11
      move; the deleted author with `deleted: true` on a user.
- [ ] `comments/deep-link`: as is. Seeded threads (an unresolved root without
      replies, a root with two replies, a resolved root);
      `blokkliComment=${seedUuid('blokkli_comment', key)}`.
- [ ] `notifications/base`: with changes. Mentions of Anna in seeded comments
      make the notifications. Drupal shows 16 per page, not 3: 33 mentions, or a
      new paging assertion. Test 4: a hostless notification from a node with
      `deleted: true`; its `edit-state:approved` part stays (mock only).
- [ ] `ownership/base`: with changes. Anna opens first, a second editor sees the
      banner; `pbTakeOwnership`, then no banner after a reload. Test 3 as
      Élodie, who can't take over.
- [ ] `publish/base`: with changes. An unpublished node, texts for the scheduled
      notice; the bodies of `pbPublish`/`pbSchedule` and a reload; a future
      pinned date; `timezoneId`; reopen after each publish (it deletes the edit
      state).
- [ ] `publish/violations`: splits. Clicking a violation moves (with
      `broken.yml`); two violations from an empty paragraph maybe with an empty
      `embed` (two required fields, unverified); the plain error by faking the
      `pbPublish` response (`page.route`).
- [ ] `block-scheduler/base`: with changes. Banner, link, section, step and text
      have scheduling; `pbSetParagraphSchedule`; a future pinned clock.
      Unpublish-only on a `call_to_action`.
- [ ] `changelog/base`: as is.
- [ ] `exit/base`: as is; the expected path is the fixture's.
- [ ] `entity-title/base`: with changes. A published and an unpublished node;
      the scheduled badge through `adapter.scheduleEditState` with a future
      date, then a reload.

### Editor UI

- [ ] `add-block-drag`: as is. `field_paragraphs`; a title opens `field_title`.
- [ ] `AppMenu`: as is. Test 3 needs a DE translation.
- [ ] `diff-approval-chunks`: `.test`. Two keyed texts with the `before` markup,
      `update_text_fields` with `after`. Unverified: the segment rectangles and
      the exact stored value with Drupal's markup.
- [ ] `diff-approval-edit`: `.test`. `update_text_fields` on the node's
      `field_lead`; the chunk test with a text.
- [ ] `diff-approval-grouping`: `.test`, splits. Tests 3 and 5 with a teaser
      (title and lead, neither bound to an element), test 4 with
      `<p>Alpha</p><p>Beta</p>`; tests 1–2 on the widget.
- [ ] `diff-approval-keyboard`: `.test`. Updates in reverse order: a title's
      `field_title`, the node's `field_lead`, its title.
- [ ] `diff-approval-restore`: `.test`. Applying now saves; test 3 through
      `pbUpdateHostEntityFieldValue`. The `<BlokkliEditable>` comparison is lost
      (the sandbox only uses the directive).
- [ ] `drag-start`: as is. Two adjacent titles.
- [ ] `Sidebar`: with changes. The localStorage option for
      `blokkli:sidebar:active:right`; a DE translation for test 3.
- [ ] `selection/add-buttons`: as is, but much content. A full field
      (`call_to_action` with four links, or three teasers in `field_related`),
      an empty `columns.field_left`, the editorial front page for fragments;
      search for "teaser" and "Today".
- [ ] `selection/shortcuts`: as is. `columns` (a title in `field_left`, three
      texts in `field_right`), then a text.
- [ ] `command-palette/base`: as is; run a harmless command by its ID.
- [ ] `responsive-preview/base`: as is. A long page, a keyed target paragraph;
      the card's `box` becomes `table.striped` (`is-striped`), the grid's header
      `columns.field_left`.
- [ ] `breadcrumbs/base`: as is. Keyed `columns` with three keyed titles in
      `field_left`.
- [ ] `anchors/base`: with changes. The title paragraph's ID (a slug of
      `field_title`) instead of the `anchorId` option; test 9 expects
      `<linkPath>#my-section`. Test 8 stays.

### Analyze, options, editable fields, charts

- [ ] `analyze/alt-text`: with changes. An editorial node without images; two
      image media, with and without alt (as fixture paragraphs); revert all
      changes between tests.
- [ ] `analyze/heading-structure`: with changes. An editorial node; title is the
      H2, `accordion` the H3 that skips a level.
- [ ] `analyze/validations`: with changes. Passes on `blocks.yml`; the rest on a
      node with two stored violations (not `broken.yml`, which has one).
- [ ] `analyze/highlight-click`: with changes. The two-violation node; the cold
      load is a second `openEditor`.
- [ ] `options/mutations`, `options/rendering`, `options/tooltips`: on the
      widget, close to the mock specs (its cells show each option's value).
      `resolveOptionText` and `setupWidget` take the bundle and a seeded widget;
      the stored values from the mutations' request bodies
      (`pbUpdateParagraphOption`, `pbBulkUpdateParagraphBehaviorSettings`).
- [ ] `editable-field/frame`: with changes. `text.field_text`; the frame URL is
      the Drupal adapter's `buildEditableFrameUrl`; `pbUpdateFieldValue`.
- [ ] `editable-field/plaintext`: with changes. `title.field_title`; required:
      `call_to_action.field_title` or `step.field_title` (maximum 255); the
      fallback: a link without a title; `pbUpdateFieldValue`.
- [ ] `editable-field/readability`: as is, on the node's `field_lead`.
- [ ] `charts/colors`: with changes. Wait for `pbUpdateParagraphOption`.

### Clipboard, add list, history and the block actions

- [ ] `clipboard/copy-paste`: as is, with `fieldName: 'field_paragraphs'`.
- [ ] `clipboard/paste`: splits. Drupal turns plain text into a `text` only (no
      bundle selector): test 2 becomes "adds a text", test 5 skips the selector.
      Tests 1 and 3 stay, test 4 with the YouTube fake.
- [ ] `clipboard/native-drop`: test 1 (its bundles become `['text']`), test 2
      with the YouTube fake.
- [ ] `add-list/actions`: with changes. On the front page (fragments).
- [ ] `add-list/base`: with changes. On the front page; grid becomes `section`
      or `columns`; inside a container the fragment action is disabled.
- [ ] `add-list/help`: with changes. Types with a description and an icon:
      `steps`, `call_to_action`, `teaser_list`, `step`; fragments `today` and
      `quick_links`.
- [ ] `history/base`: with changes. Revert all changes between tests;
      `pbSetHistoryIndex`.
- [ ] `fragments/base`: with changes. On the front page, `quick_links` and
      `today`; `pbAddFragmentParagraph`. Unverified: that both fragments render
      with the fixtures' config pages.
- [ ] `edit/base`: splits. Tests 1–4 on `blocks.yml`; `columns` instead of
      `two_columns`; a seeded fragment for the fragment test. Without edit
      permission: Jonas and a seeded chart.
- [ ] `duplicate/base`: with changes. Jonas on his own node with a seeded chart
      (he can't add one); a full field. Unverified: that the Drupal adapter
      enables duplicating.
- [ ] `delete/base`: with changes. Jonas and a seeded chart (he can't delete
      one).
- [ ] `conversions/base`: with changes. title → text, text → title, link → text
      (`blokkli_playground`'s plugins), none for images; find the converted
      paragraph by its new UUID; `pbConvertParagraph`/`pbConvertMultiple`.
- [ ] `block-transfer/base`: with changes, after the transfer permission.
      Export: capture the clipboard; import: `pbImport`; Drupal's envelope
      (version 1, `bundle`, `non_translatable_values`, `translations`,
      `nested_paragraphs`). Test 4 on a `page` (several paragraph fields).

## Staying behind

What the mock suite keeps until it goes:

- `translations/link-title-translate`: links are never translatable.
- `clipboard/paste` tests 1 and 3: Drupal turns plain text into one paragraph
  type; offering several would be a module change for little gain.
- `tools/processed-text`: the 6 tests on plain strings.
- `anchors/base` test 8: the Drupal adapter always has `buildAnchorLink`.
- `notifications/base` test 4: the `edit-state:approved` part.

## Acceptance criteria

- Every mock spec has moved, or is listed under "Staying behind" with its
  reason.
- The Drupal suite passes, and the moved mock specs are deleted.
