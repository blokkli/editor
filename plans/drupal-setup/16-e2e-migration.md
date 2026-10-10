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
  suite; the mock suite's top-level specs stay top-level, and
  `features/agent/mock-scripts/` becomes `features/agent/`. `git mv` the mock
  spec, so its history follows; one that only partly moves is deleted once the
  Drupal version passes.
- **A spec that ran whatever came first** (e.g. the first command of the
  palette) picks a harmless one by its ID: Drupal would publish or discard as
  readily as anything else.
- **Waiting:** a change goes through Drupal, so `expect.poll`'s default second
  can be too short. Wait for its mutation (`nextMutation`) before asserting.
  Options are an exception: Drupal stores them when the paragraph is deselected
  (or an action runs), the editor and the preview have them before.
- **The adapter recorder** (`waitForAdapterCall`, `?testing=true`):
  `nextMutation(page, '<name>')` (`support/mutations.ts`) returns the next
  request's variables, typed; started before the action, awaited after. Then
  reload or reopen to see what Drupal stored. The items are shaped as in the
  schema (e.g. `{uuid, name, value, langcode}`). That nothing was sent:
  `countMutations(page, '<name>')`, started in `beforeAll`, compared before and
  after.
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
  `uid` defaults to the current user). `claimEditState(sandbox, user, path)`
  opens and closes the editor for that.
- **Media:** a seeded media's UUID is `seedUuid('media', key)`; numeric IDs
  follow the order of creation, don't rely on them. Files go in
  `test/e2e-drupal/content/files/`. Adding one through the adapter needs its
  numeric ID: find it in the media library by its name
  (`mediaLibraryGetResults`, see `analyze/alt-text`).
- **Violations:** Drupal reports none for an added empty paragraph; seed content
  it doesn't allow (`invalid: true`).
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
    `outdated: [de]` (there: `nodes/waste-collection.yml`), one with
    English-only paragraphs (there: `nodes/notices.yml`), an unpublished one
    (`status: false`; there: `nodes/draft.yml`, `nodes/announcement.yml`)
  - the editorial front page with fragments, an empty page, a long page (there:
    `nodes/home.yml`, `nodes/empty.yml`, `nodes/long.yml`); an empty editorial
    page (there: `nodes/blank.yml`)
  - nestings: `columns` (`field_left`/`field_right`), `accordion`, `section`; a
    teaser with `field_title`/`field_lead` and a `field_link` to a node; a
    `call_to_action`; a `table`; a `chart`; a full `field_related` (3 teasers)
  - a node with two stored violations (`invalid: true`; there:
    `nodes/faulty.yml`)
  - image media with and without alt, with files in
    `test/e2e-drupal/content/files/` (there: `media.yml`)
  - comment threads (resolved and unresolved, with mentions of Anna by another
    user; there: `comments.yml` on `nodes/feedback.yml`, the mentions on
    `nodes/mentions.yml` and `nodes/removed.yml`), `templates.yml` (there:
    columns with two texts), library items

### Additions to the sandbox

- [x] **The widget** (test-only paragraph type, see "Decisions"): done. `widget`
      (config, `Paragraph/Widget`), `field_title` bound, `field_lead` only
      prop-mapped, `field_link` external only with an optional title;
      `blokkli_playground_test` (`blokkli_playground/tests/modules/`, installed
      by `bake-e2e`) allows it on pages; `nodes/widgets.yml`. The playground's
      options, with labels in EN/DE/FR and without its `background` global
      option.
- [x] Demo options: done.
  - Title: "Anchor" (`anchor`, text: one ID in every language, also used by the
    table of contents) and "In the table of contents" (`toc`, checkbox, only on
    detail pages), grouped as "Navigation"
  - Chart: "Height" (`height`, range, in percent of the usual height), grouped
    with its width as "Format"
  - Teaser list: "Number of items" (`count`, number, replaces the hard-coded 3),
    and descriptions on its source choices
  - Call to action: a date (`date`, datetime-local), shown under the title; on
    the front page the next municipal assembly's. The seed turns a relative date
    into a `datetime-local` option's value (the options schema says which).
  - Group labels can't be translated (F56): "Navigation" and "Format" are the
    same in all three languages.
- [x] `transfer blokkli paragraphs` for `content_editor` and `restricted_editor`
      (pasting a chart as Jonas then shows what was skipped): done.
- [x] `call_to_action`: unpublish scheduling only (it promotes something with a
      deadline): done.
- [ ] Jonas (`restricted_editor`) loses `update paragraph content chart` ("may
      not add, change or delete charts"), after F55 is fixed. Update the welcome
      texts (EN/DE/FR), the sandbox skill and `CONTRIBUTING.md`. Then
      `edit/base`'s last test moves (a seeded chart Jonas can't edit).
- [x] Élodie (`translator`) loses "take ownership": done. An edit state covers
      every language, so taking one over would hand her the editors' unfinished
      changes. The welcome texts say she can't take over a page someone else is
      editing.
- [ ] The teaser maps its `field_title` and `field_lead` with
      `propsFieldMapping`, so changes to them preview live.
- [x] A text filter for `basic_html` that marks external links: done.
      `blokkli_playground`'s `ExternalLinks`, after `filter_html`: every http(s)
      link gets `target="_blank"` and a visually hidden "(opens in a new tab)"
      (translated). A stored hint compounds visibly: `filter_html` keeps its
      text, the filter appends another.
- [x] The seed: `deleted: true` on users and nodes, deleted after seeding (a
      comment by a deleted author, a notification whose page is gone): done.
- [x] A fake for YouTube and Vimeo: done. `VideoFake`, an HTTP client middleware
      in `blokkli_playground_test`, answers the oEmbed providers list (without
      discovery), the video data and the thumbnail.

### Agent (`features/agent/`)

- [x] `mock-scripts/conversation-restore`: done
      (`features/agent/conversation-restore.test.ts`, on
      `nodes/translated.yml`).
- [x] `mock-scripts/full-flow`: deleted; `test/e2e-drupal/agent.test.ts`
      ("answers from its script") covers it.
- [x] `mock-scripts/grid-with-cards`: done, as
      `features/agent/ask-then-add.test.ts` (`columns` with a title and three
      texts, on `nodes/empty.yml`).
- [x] `mock-scripts/mode-context`: done. Anna on `/en/empty` (editing) and
      `/de/bibliothek` (translating), then Lea on `/en/empty` (read-only).
- [x] `mock-scripts/mode-guard`: done. Lea on `/en/empty`, after Anna
      (`claimEditState`).
- [x] `mock-scripts/ownership-flow`: done. As mode-guard; Lea takes ownership
      (`pbTakeOwnership`).
- [x] `mock-scripts/routing-autoload`: done.
- [x] `mock-scripts/selection-context`: done, on the keyed paragraphs of
      `nodes/blocks.yml`.
- [x] `tools/add_paragraphs`: done, on `nodes/empty.yml`; `columns` >
      `field_left` > text, and `accordion` > `columns` > two texts.
- [x] `tools/add_template`: done, the seeded template by its UUID.
- [x] `tools/auto_translate_paragraphs`: done, on `/de/mitteilungen`
      (`nodes/notices.yml`): an English-only title instead of the card
      (`acceptedCount` 1); the DeepL fake; `pbBulkTranslateFieldValues`.
- [x] `tools/duplicate_paragraphs`: done, the columns of `nodes/nested.yml`.
- [x] `tools/get_all_page_content`: done, the teaser of `nodes/reading.yml` (its
      title and lead have neither a directive nor a props mapping; Drupal's raw
      values have them).
- [x] `tools/get_page_text`: done, `nodes/reading.yml` (editorial: no date in
      the snapshot).
- [x] `tools/processed-text`: done, on `nodes/links.yml` (texts with an external
      link). The 14 markup tests are 12 there: with one fixture, the link cases
      fold into the markup ones (`get_content_fields`, a patch next to the
      link). The 6 on plain strings stay: Drupal never processes those.
- [x] `tools/update_text_fields`: done, on the title of `nodes/blocks.yml`; the
      stored items of `pbBulkUpdateFieldValues` instead of a reload. It found
      that the editor lost Vue's text node of a field rendered with `{{ }}` (the
      mock's components use `v-text`), so an applied suggestion or an undo after
      an inline edit didn't show: fixed in `useEditableFieldOverride`, tested by
      `editable-field/rerender` (also for `v-html`).

### Translations, comments, publishing

- [x] `translations/auto-translate`: done. Tests 1–2 on the English-only titles
      of `/de/mitteilungen` (`nodes/notices.yml`, one per test); tests 3–4 on
      the widgets of `/de/widgets`, whose element-less `field_lead` can come
      first (fields without an element keep their input order); the DeepL fake;
      `pbBulkTranslateFieldValues` and a reload.
- [x] `translations/banner-and-switcher`: done. The switcher on
      `nodes/translated.yml`; the banner on `/de/kehrichtabfuhr`
      (`nodes/waste-collection.yml`, `outdated: [de]`),
      `pbClearOutdatedTranslation`, still none outdated after a reload.
- [x] `translations/batch-translate`: done, on `/de/mitteilungen`
      (`nodes/notices.yml`: two English-only titles and a text, a title with its
      own German value for the preselection); `revertAllChanges` between tests.
      The rich-text test works with Drupal's CKEditor frame.
      `openTranslateDialog` now waits for the rows: Drupal loads them with a
      query.
- [x] `translations/csv-export`: done, on the title of `nodes/translated.yml` (a
      plain value: its German value is the English one).
- [x] `translations/csv-import`: done, on `/de/mitteilungen`;
      `pbBulkTranslateFieldValues` and a reload; `revertAllChanges` between
      tests.
- [x] `translations/link-title`: done, on the widgets' `field_link.title`
      (`nodes/widgets.yml`); the `link` paragraph is the control (its title is a
      field of its own); `props.link.uri` is `{ path }`.
- [ ] `translations/link-title-translate`: stays (links are never translatable);
      a test for F58's fix replaces it.
- [x] `comments/base`: done, all 11, on `nodes/feedback.yml`; the deleted author
      is Nora Huber (`users.yml`, `deleted: true`).
- [x] `comments/deep-link`: done, on `nodes/feedback.yml` (`comments.yml`: an
      unresolved root without replies, a root with two replies, a resolved
      root). Not "Comments": nginx sends `/en/comments` to Drupal.
- [x] `notifications/base`: done. Lea's replies on `nodes/mentions.yml` mention
      Anna 33 times, so more than two pages of 16; test 4 on `mention-32` and on
      `removed-question`, whose page (`nodes/removed.yml`, `deleted: true`) is
      gone. Its `edit-state:approved` part stays in the mock suite
      (`test/e2e/features/notifications/base.test.ts`).
- [x] `ownership/base`: done, on `nodes/translated.yml`: Anna claims the edit
      state, Lea sees the banner and takes over (`pbTakeOwnership`, still hers
      after a reload); Élodie, on `/fr/bibliotheque`, gets no button.
- [x] `publish/base`: done. `nodes/draft.yml` (save, then publish; the dialog
      leaves the editor, the spec reopens it and checks the status) and
      `nodes/announcement.yml` (the scheduler, pinned to 15 June next year in
      UTC; the scheduled badge after a reload); `pbPublish`, `pbSchedule`,
      `pbSetParagraphSchedule`.
- [x] `publish/violations`: done, on `nodes/faulty.yml` (its two stored
      violations; the publish validation reports them too); the plain error by
      faking the `pbPublish` response (`page.route`, matched by pathname);
      `revertAllChanges` between tests.
- [x] `block-scheduler/base`: done, on the editorial page `nodes/blank.yml` (it
      allows a call to action): a title for "neither", a call to action for
      "unpublish only", texts for both sections; `pbSetParagraphSchedule`; the
      clock pinned to 15 June next year.
- [x] `changelog/base`: done.
- [x] `exit/base`: done.
- [x] `entity-title/base`: done. `nodes/draft.yml` (unpublished), the blocks
      page (published), `nodes/announcement.yml` scheduled through
      `adapter.scheduleEditState` 30 days ahead, then a reload.

### Editor UI

- [x] `add-block-drag`: done. `dragNewBlockIntoPage` now scrolls the add-list
      item to the middle: the sandbox's rail scrolls, and its actions cover its
      bottom.
- [x] `AppMenu`: done, test 3 on `nodes/translated.yml`.
- [x] `diff-approval-chunks`: done, on `/en/empty`: an added text, seeded with
      the `before` markup by `applyChunkFieldDiff`. The five segment rectangles
      and the exact stored value hold with Drupal.
- [x] `diff-approval-edit`: done, on `nodes/reading.yml`: its `field_lead`
      (`pbUpdateHostEntityFieldValue`), an added text for the chunk test.
- [x] `diff-approval-grouping`: done
      (`test/e2e-drupal/diff-approval-grouping.test.ts`): the teaser of
      `nodes/reading.yml`, its text for the whitespace test; tests 1–2 on a
      widget of `nodes/widgets.yml`, in a second page.
- [x] `diff-approval-keyboard`: done, on `nodes/reading.yml`: the node's title
      and `field_lead`, its title paragraph's `field_title` (asserted: three
      items, or the reverse order proves nothing).
- [x] `diff-approval-restore`: done, on `nodes/reading.yml`; tests 3 and 4 wait
      for `pbUpdateHostEntityFieldValue`. The `<BlokkliEditable>` comparison is
      lost (the sandbox only uses the directive).
- [x] `drag-start`: done, on the title and the first text of `nodes/blocks.yml`.
- [x] `Sidebar`: done, on `nodes/translated.yml` (its German translation for
      test 3).
- [x] `selection/add-buttons`: done, on the front page (a `call_to_action` with
      four links, `columns` with an empty `field_left`). The full field's test
      also counts the paragraphs: its field only allows links, which a wrong
      button would add right away. Enter adds `columns` (a teaser opens its form
      first). The selector, opened by the event, sits under the toolbar:
      `afterEach` closes it by deselecting.
- [x] `selection/shortcuts`: done, on `nodes/nested.yml`.
- [x] `command-palette/base`: done; Enter and click open the structure and
      history sidebars.
- [x] `responsive-preview/base`: done, on `nodes/long.yml` with keyed
      paragraphs; the table's `striped` option (`is-striped`), `columns`'
      `field_left`.
- [x] `breadcrumbs/base`: done, on `nodes/nested.yml` (the three texts in
      `field_right`).
- [x] `anchors/base`: done, on titles added to `nodes/blank.yml`, with their
      `anchor` option instead of `anchorId`; a call to action is the tall
      paragraph above. Test 9 expects the node's system path
      (`/node/<n>#my-section`). Test 8 stays in the mock suite.

### Analyze, options, editable fields, charts

- [x] `analyze/alt-text`: done, on `nodes/blank.yml`; "The lake" and "The hills"
      (`media.yml`), added through the media library's IDs; `revertAllChanges`
      between tests.
- [x] `analyze/heading-structure`: done, on `nodes/blank.yml`; `title` is the
      H2, an empty `accordion` the H3 that skips a level.
- [x] `analyze/validations`: done. Passes on `blocks.yml`; the rest on
      `nodes/faulty.yml` (a gallery with a title and a text).
- [x] `analyze/highlight-click`: done, on `nodes/faulty.yml`; the cold load is a
      second `openEditor`.
- [x] `options/mutations`, `options/rendering`, `options/tooltips`: done, on
      widgets added to `/en/widgets` (`setupWidget` takes the field name). The
      stored values from the mutations' request bodies
      (`pbUpdateParagraphOption`, `pbBulkUpdateParagraphBehaviorSettings`); the
      global option of the defaults test is `bkVisibleLanguages`.
- [x] `editable-field/frame`: done, on `/en/empty`; `pbUpdateFieldValue`.
      `editableFrame` waits for the editor's first message (`data-test-ready`):
      Drupal's page loads too slowly for the old wait.
- [x] `editable-field/plaintext`: done, on the front page. `title.field_title`
      (optional), `call_to_action.field_title` (required, maximum 255, a new one
      is "Lorem ipsum dolor"), the fallback on `home-link` (it shows "Blocks");
      `pbUpdateFieldValue`, and `countMutations` for "nothing stored".
- [x] `editable-field/readability`: done, on the node's `field_lead`.
- [x] `charts/colors`: done, on `/en/empty`; closing waits for
      `pbUpdateParagraphOption` (`closeComplexOption` no longer waits for the
      mock's recorder).

### Clipboard, add list, history and the block actions

- [x] `clipboard/copy-paste`: done.
- [x] `clipboard/paste`: done. Tests 2, 4 and 5, on the blocks page: plain text
      adds a text (no selector), a YouTube URL a video (`pbAddVideoRemote`, the
      fake's media name). Tests 1 and 3 stay in the mock suite.
- [x] `clipboard/native-drop`: done, on the blocks page: its bundles are
      `['text']`; the YouTube URL with the video fake.
- [x] `add-list/actions`: done, on the front page.
- [x] `add-list/base`: done, on the front page; the seeded `home-columns`
      instead of a new grid. With it selected, the fragment action is disabled.
- [x] `add-list/help`: done, on the front page; `call_to_action` and `steps` (a
      description and an icon), `columns` for the fields.
- [x] `history/base`: done, on `/en/empty`; `revertAllChanges` between tests,
      `pbSetHistoryIndex` after each move.
- [x] `fragments/base`: done, on the front page; `pbAddFragmentParagraph`. Both
      fragments render without config pages ("Frequently searched" shows its
      placeholder while editing). "Nothing sent" counts the mutation's requests.
- [ ] `edit/base`: done but for "without edit permission", which waits for Jonas
      (above). On the front page: its text, the call to action for the
      multi-selection, `home-columns` for `disableEdit`, and a seeded
      `quick_links` fragment.
- [x] `duplicate/base`: done. Anna on the front page (the full field: the call
      to action's links), Jonas on `nodes/statistics.yml` (a chart he can't
      add); `pbDuplicateParagraph`.
- [x] `delete/base`: done. Anna on `/en/empty`, Jonas on `nodes/statistics.yml`
      (a chart he can't delete); `pbDeleteMultipleParagraphs`.
- [x] `conversions/base`: done, on `nodes/conversions.yml` (two titles, a text,
      an image); the converted paragraph by its new UUID, its stored values;
      `pbConvertParagraph`/`pbConvertMultiple`; `revertAllChanges` between
      tests.
- [x] `block-transfer/base`: done, on the blocks page (a `page` has several
      paragraph fields, so a paste starts a drag). The export from the captured
      clipboard (`captureClipboard`); `pbImport`; the crafted envelope in
      Drupal's format (version 1, `bundle`, `translations`,
      `nested_paragraphs`).

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
