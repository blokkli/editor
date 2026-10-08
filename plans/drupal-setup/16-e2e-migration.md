# 16: Migrate the mock E2E specs to Drupal

- **Status:** todo

## Goal

The mock playground's E2E specs (`test/e2e/`) move to the Drupal suite
(`test/e2e-drupal/`), rewritten against its fixtures, so that the mock suite can
go one day (the user, 2026-10-08). A spec moves when the Drupal setup supports
what it tests; what only the mock can do stays in the mock suite for now.

The assessment below (2026-10-08) read every spec and checked its claims in the
code; nothing was run. "Unverified" marks what it couldn't confirm.

## Open decisions

- **What replaces `window.__BLOKKLI__.test`** (the playground's `test-cases`
  feature: `runAgentTool`, `runComponentTool`, `runDiffApproval`,
  `applyFieldDiff`, …). Either an agent mock script that calls the tool (no
  extra code in the sandbox, but one script per page, and applying saves), or a
  small test-only feature in the sandbox frontend. Recommended: mock scripts.
- **The tests that stay behind** (see "Staying behind"): add test-only pieces to
  the E2E template, or let the tests go. Recommended: the cheap ones (a role
  with `transfer blokkli paragraphs`, the other roles, a YouTube fake); the
  option types only if the options specs should be kept whole.

## How a spec moves

- **Where:** `test/e2e-drupal/features/<feature>/<name>.test.ts`, as in the mock
  suite. The mock spec (or the tests that moved out of it) is deleted once the
  Drupal version passes.
- **The adapter recorder** (`waitForAdapterCall`, `?testing=true`): a mutation's
  variables are its request body (nuxt-graphql-middleware posts them as JSON),
  so wait for the request to `/api/graphql_middleware/mutation/<name>` and read
  `postDataJSON()`. Then reload or reopen to see what Drupal stored. The items
  are shaped as in the schema (e.g. `{uuid, name, value, langcode}`).
- **Resetting the mock's localStorage between tests:**
  `app.adapter.revertAllChanges()` (`pbRevertAllChanges`, deletes the edit
  state), then `reloadState`, then wait for no mutations. Or reset the sandbox
  and reopen.
- **Permission overrides:** a user with the right role. `restricted_editor`
  (Jonas) can't create or delete `chart` and `section`.
- **`.test`, with mock scripts:** a scripted `tool_use` runs the tool in the
  client for real; read its result from `getAgentTranscript()` (the
  `tool_result` block's `full ?? seen`; `agentMessage` is called `label` there).
  Component tools show their approval in the agent panel (`applyDiff`). Lazy
  tools: add a `routing` entry with the tool (whether a lazy tool needs loading
  is unverified).
- **Ownership:** `canEdit` needs `currentUserIsOwner`. A second user on the same
  node gets a read-only editor: give each user their own node, or use that for
  the read-only tests. Edit states can't be seeded; the owner is whoever opens
  the editor first (unverified).
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

- [ ] Helpers in `test/e2e-drupal/support/`: wait for a mutation and return its
      request body; revert all changes; run a tool through a mock script and
      return its result (if mock scripts are chosen).
- [ ] `openEditor` options: localStorage entries, `timezoneId`, and opening
      without a mock script (conversation restore: an empty script disables
      auto-restore; this conflicts with "always mocked", decide how).
- [ ] Fixtures:
  - users: Marc Brunner (reviewer), Élodie Favre (translator), Jonas Weber
    (restricted_editor), a second content_editor
  - a node with DE and FR translations, one with `outdated: [de]`, an
    unpublished one (`status: false`)
  - the editorial front page with fragments, an empty page, a long page
  - nestings: `columns` (`field_left`/`field_right`), `accordion`, `section`; a
    teaser with `field_title`/`field_lead` and a `field_link` to a node; a
    `call_to_action`; a `table`; a `chart`; a full `field_related` (3 teasers)
  - a node with two stored violations (`invalid: true`)
  - image media with and without alt, with files in
    `test/e2e-drupal/content/files/`
  - comment threads (resolved and unresolved, with mentions of Anna by another
    user), `templates.yml`, library items
- [ ] Verify: whether opening the editor makes a user the edit state's owner;
      whether seeded media get stable IDs.

### Agent (`features/agent/`)

- [ ] `mock-scripts/conversation-restore`: with changes. Wait for
      `pbAgentConversationUpsert` instead of polling the playground route; the
      reading pages open without a mock script; a translated node for the
      cross-language test.
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
- [ ] `tools/processed-text`: splits. Drupal only runs `filter_html`, which is
      idempotent and strips attributes, so the marker flips: seed `field_text`
      with what it strips (`<p class="x">`, `<a target="_blank">`) and assert
      the agent sees and keeps it. About 11 tests move; about 7 stay (see
      "Staying behind").
- [ ] `tools/update_text_fields`: `.test`. A title's `field_title` (plain, so
      the plaintext editor opens); assert after a reload.

### Translations, comments, publishing

- [ ] `translations/auto-translate`: with changes. A node with a translated
      title, opened at `/de`; seeded EN-only titles (adding while translating is
      unverified); the DeepL fake; `pbBulkTranslateFieldValues` and a reload.
      Tests 1–2 move, 3–4 stay.
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
- [ ] `translations/link-title`, `translations/link-title-translate`: stay.
- [ ] `comments/base`: with changes. Seeded threads, a second user. 10 of 11
      move; the deleted author stays.
- [ ] `comments/deep-link`: as is. Seeded threads (an unresolved root without
      replies, a root with two replies, a resolved root);
      `blokkliComment=${seedUuid('blokkli_comment', key)}`.
- [ ] `notifications/base`: with changes. Mentions of Anna in seeded comments
      make the notifications. Drupal shows 16 per page, not 3: 33 mentions, or a
      new paging assertion. Tests 1–3 and 5 move, test 4 partly.
- [ ] `ownership/base`: with changes. Anna opens first, a second editor sees the
      banner; `pbTakeOwnership`, then no banner after a reload. Tests 1–2 move,
      test 3 stays.
- [ ] `publish/base`: with changes. An unpublished node, texts for the scheduled
      notice; the bodies of `pbPublish`/`pbSchedule` and a reload; a future
      pinned date; `timezoneId`; reopen after each publish (it deletes the edit
      state).
- [ ] `publish/violations`: splits. Clicking a violation moves (with
      `broken.yml`); two violations from an empty paragraph maybe with an empty
      `embed` (two required fields, unverified); the plain error stays.
- [ ] `block-scheduler/base`: with changes. Banner, link, section, step and text
      have scheduling; `pbSetParagraphSchedule`; a future pinned clock. 5 of 6
      move; unpublish-only stays.
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
      `<p>Alpha</p><p>Beta</p>`; tests 1–2 stay.
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
- [ ] `options/mutations`: splits. Stand-ins: `table.striped` (checkbox),
      `link.style` or `contact.display` (radios), `gallery.display` (icons),
      `columns.ratio` (grid), `text.box` (colours), `bkVisibleLanguages`
      (checkboxes). 10 tests move, 6 stay.
- [ ] `options/rendering`: splits. The same stand-ins; colours only as class
      swatches; `bkVisibleLanguages` needs a seeded value. 7 move, 6 stay.
- [ ] `options/tooltips`: splits. 4 move (hover, description through
      `bkVisibleLanguages`, `table.striped` without one, the clip path), 3 stay.
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
      Tests 1 and 3 stay, test 4 (YouTube) is blocked.
- [ ] `clipboard/native-drop`: splits. Test 1 moves, test 2 (YouTube) is
      blocked.
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
      `two_columns`; a seeded fragment for the fragment test. The test without
      edit permission stays.
- [ ] `duplicate/base`: with changes. Jonas on his own node with a seeded chart
      (he can't add one); a full field. Unverified: that the Drupal adapter
      enables duplicating.
- [ ] `delete/base`: with changes. Jonas and a seeded chart (he can't delete
      one).
- [ ] `conversions/base`: with changes. title → text, text → title, link → text
      (`blokkli_playground`'s plugins), none for images; find the converted
      paragraph by its new UUID; `pbConvertParagraph`/`pbConvertMultiple`.
- [ ] `block-transfer/base`: with changes, blocked: no role has
      `transfer     blokkli paragraphs`. Export: capture the clipboard; import:
      `pbImport`; Drupal's envelope (version 1, `bundle`,
      `non_translatable_values`, `translations`, `nested_paragraphs`).

## Staying behind

What the Drupal setup can't do yet, and what would change that:

| Tests                                                   | Missing                                                    | Unless                                   |
| ------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| options: text, colour, range, number, date, groups (15) | no paragraph has these option types or radios descriptions | a test-only paragraph type and component |
| `link-title`, `link-title-translate` (2 files)          | every link field has its title off                         | a link field with a title                |
| auto-translate 3–4, diff-approval-grouping 1–2          | no field without an element but with a props mapping       | e.g. a `propsFieldMapping` on the teaser |
| block-transfer (5)                                      | no role has `transfer blokkli paragraphs`                  | the permission for a role                |
| ownership 3, edit "without edit permission"             | no role edits without taking ownership or per-type update  | a test role                              |
| paste 4, native-drop 2                                  | YouTube's oEmbed                                           | a fake, like the DeepL one               |
| block-scheduler unpublish-only                          | no type has only unpublish scheduling                      | a config change                          |
| comments' deleted author, notifications without a host  | the seed needs a known user and a host                     | seed support                             |
| processed-text (about 7)                                | Drupal's processing is idempotent                          | a test-only text filter                  |
| paste 1 and 3, the plain publish error, anchors 8       | the mock's own behaviour                                   | —                                        |

## Acceptance criteria

- Every mock spec has moved, or is listed under "Staying behind" with its
  reason.
- The Drupal suite passes, and the moved mock specs are deleted.
