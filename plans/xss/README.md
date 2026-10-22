# XSS hardening

The editor renders content as HTML in many places and has no sanitiser. Surveyed
with the user on 2026-10-22 by reading the code. Statuses: `to verify` (read in
the code, not reproduced) and `open` (reproduced by the canary, step 1). A fixed
finding is removed; its canary test then checks the fix.

Code references are relative to the repository at `2ab548f71`, and to
`sandbox/drupal/paragraphs_blokkli` at `553eb61` for `paragraphs_blokkli`.

## What counts as untrusted

- **Trusted:**
  - the editor's own strings, icons and changelog;
  - `$t()` texts, unless a value from content is put into them;
  - the project's code: the adapter, block definitions, module options.
- **Text:** labels and descriptions that site admins write (paragraph types,
  bundles, fields). They're plain text in Drupal too, so the editor renders them
  as text.
- **Untrusted:**
  - anything an editor can write: field values, titles, alt texts, comments,
    display names, agent conversations;
  - files and pasted content;
  - machine translations;
  - the model's output.

Drupal filters a formatted field only when it renders it (`processed`), but the
editor also reads the raw stored `value` (`textFieldValues`). And escaped text
becomes markup again when the editor reads it back with `textContent`.

## Already safe

- Drupal's own output:
  - the module's Twig template, forms and list builders;
  - `drupalSettings` (a URL and a format id);
  - the redirect page (`js/redirect.js`, no inline script).
- Mutations coerce text formats to ones the user may use
  (`resolveTextFieldItem()`, `resolveTextFormat()`,
  `src/ParagraphsBlokkliHelper.php:202`, `:265`). Pasted HTML goes through the
  format's HTML restrictions (`AddClipboardText`).
- Violation messages come back as escaped markup. The editor renders `errors[]`
  and upload errors as text.
- The Search API provider strips tags from what it returns.
- Uploads need a CSRF header token. graphql 5 refuses mutations sent as
  `text/plain` or with GET.
- **Parsing** (since X6's fix): `parseHtml()`
  (`src/runtime/editor/helpers/html`) parses in a document without a window; the
  diffs, the translate dialog and the paste use it. The other places parse with
  `DOMParser` (the Drupal adapter, `clipboardData`, `enrichRichContent`, the
  readability checks, `translations/violations.ts`).
- The clipboard's `sanitizeHtml()` removes every attribute but `href` from
  pasted HTML.
- **Previews** (since X4's fix): the editable field override
  (`useEditableFieldOverride()`) sanitises a formatted field's value and every
  diff before they reach the page, a project's props or `<BlokkliEditable>`; the
  stored and proposed values keep their markup. So does the inline editor of the
  `markup` type, with the stored value it shows.
- The sandbox's own components render plain text with `{{ }}`, and `v-html` only
  for `processed` rich text.

## Findings

| #   | Finding                                                                                                                | Project              | Severity | Status    |
| --- | ---------------------------------------------------------------------------------------------------------------------- | -------------------- | -------- | --------- |
| X5  | [The diff views render values unfiltered](#x5-the-diff-views-render-values-unfiltered)                                 | editor               | medium   | to verify |
| X7  | [Message listeners accept any window](#x7-message-listeners-accept-any-window)                                         | editor               | medium   | to verify |
| X8  | [The content search returns labels with their markup](#x8-the-content-search-returns-labels-with-their-markup)         | `paragraphs_blokkli` | low      | open      |
| X9  | [Agent conversations are stored as the client sends them](#x9-agent-conversations-are-stored-as-the-client-sends-them) | both                 | low      | to verify |
| X10 | [Imports and kept formats skip the format check](#x10-imports-and-kept-formats-skip-the-format-check)                  | `paragraphs_blokkli` | low      | to verify |
| X11 | [The docs and the playground render titles with `v-html`](#x11-the-docs-and-the-playground-render-titles-with-v-html)  | docs                 | medium   | to verify |
| X12 | [`javascript:` URLs reach links and frames](#x12-javascript-urls-reach-links-and-frames)                               | editor               | low      | to verify |

## X5: The diff views render values unfiltered

- **Found:** 2026-10-22, by reading. Not reproduced.
- **Symptom:** none seen. By reading: a translation file from someone else with
  `<img onerror>` in a value runs when the file is selected, before anything is
  applied.
- **Cause:** `DiffValue` and `DiffDisplay` render with `v-html`
  (`src/runtime/editor/components/DiffViewer/DiffValue.vue:2`, `:17`;
  `DiffDisplay/index.vue:8`, `:14`, `:18`). They're fed by:
  - the "Changes" sidebar (beta) and the transform dialog's preview, with the
    blocks' props (`DiffViewer/State.vue`);
  - the CSV/PO import's preview: the file's values against the raw current
    values (`features/translations/CsvDialog/Import/index.vue:104`, `:129`);
  - the translate dialog: raw values, and the translation service's output;
  - the agent's `FieldDiffDetails`.
- **Plain fields** (moved here from X1, fixed otherwise on 2026-10-22):
  - `computeDiff()` and `computeInsertion()` treat both values as HTML, whatever
    the field type (`src/runtime/editor/helpers/diff/index.ts:371`, `:399`).
  - `setDiffHtml()` writes the result with `innerHTML`, plain fields included
    (`src/runtime/editor/composables/useEditableFieldOverride.ts:300`).
    Sanitised since X4's fix, but still as HTML: markup in a plain value shows
    as markup, not as text.
  - `splitIntoSegments()` returns `null` for plain fields
    (`helpers/diff/index.ts:647`).
- **The diff view's default:** props are rendered as HTML (`mapDiffProps`,
  `src/global/types/definitions.ts:191`). `State.vue` passes strings as they
  are; it escapes the JSON of objects since X1's fix.
- **Impact:** medium. It needs a file from someone else, or stored raw markup.
- **Fix idea:**
  - `sanitizeHtml()` (from X4's fix), on both values before diffing.
  - For plain fields, escape both values first (`escapeHtml()`).
  - The diff view's props: strings are HTML, sanitised like the values, both by
    default and from `mapDiffProps` (decided). The docs then say so
    (`docs/define-blokkli/editor.md`, `src/global/types/definitions.ts:191`).

## X7: Message listeners accept any window

- **Found:** 2026-10-22, by reading. Not reproduced.
- **Symptom:** none seen. By reading:
  - **Text field editors:** any frame in the page, e.g. an embed from another
    origin, can post `blokkli__editable_field_update_formatted` while a text
    field's editor is open. The markup goes into the page, sanitised since X4's
    fix. Posting `blokkli__editable_field_update` sets the value that is then
    saved.
  - **The responsive preview:** in the preview page, every `blokkli__…` message
    reaches its event bus, whoever sent it.
- **Cause:**
  - `onMessage()` checks neither `e.origin` nor `e.source`
    (`src/runtime/editor/features/editable-field/Overlay/Frame/index.vue:160`),
    and neither does the preview (`components/PreviewProvider.vue:148`).
  - The nested editor and the edit form's frame don't check either
    (`components/NestedEditorOverlay/index.vue:390`,
    `features/edit-form/Frame/index.vue:99`), but they only save or close.
- **Impact:** medium. It needs a frame from another origin on the page. The
  sandbox's `frame-src 'self'` blocks that; sites with embeds don't.
- **Fix idea:** accept only messages whose `e.source` is the frame's
  `contentWindow` (the preview: its parent), from the expected origin.

## X8: The content search returns labels with their markup

- **Found:** 2026-10-22, by reading. Reproduced the same day by the canary
  (`features/xss/content-search`).
- **Symptom:** a node or a media named `<img src=x onerror=…>` ran for an editor
  whose content search found it: the editor rendered the results with `v-html`.
  Fixed in the editor on 2026-10-22 (X1): it shows them as text, and the
  canary's test checks that. What's left is Drupal's side.
- **Cause:**
  - The `EntityQuery` provider returns `$entity->label()` as the title
    (`modules/paragraphs_blokkli_search/src/Plugin/ParagraphsBlokkli/Search/EntityQuery.php:170`).
    Its text and context have their tags stripped.
  - The Search API provider strips all three
    (`modules/paragraphs_blokkli_search_api/src/Plugin/ParagraphsBlokkli/Search/SearchApi.php:199`).
  - A context from `BlokkliSearchContextAwareEntityInterface` is returned as the
    entity gives it.
- **Impact:** low since the editor's fix: the providers disagree on what they
  return, and tags stripped from a label mangle a label like "a < b".
- **Fix idea:** define title, text and context as plain text in the schema, and
  stop stripping tags.

## X9: Agent conversations are stored as the client sends them

- **Found:** 2026-10-22, by reading. Not reproduced.
- **Symptom:** none seen. By reading: a conversation uploaded with a crafted
  `dataUser` ran for an admin who opened it in the conversations admin, until
  X2's fix.
- **Cause:**
  - `AgentConversationUpsert` stores `title`, `hash`, `dataUser` and
    `dataServer` as sent
    (`modules/paragraphs_blokkli_agent/src/Plugin/GraphQL/DataProducer/AgentConversationUpsert.php:124`,
    `:146`).
  - Drupal never checks the hash.
  - The agent server's HMAC covers `messages` and `activatedLazyTools`, not
    `dataUser` (`src/modules/agent/runtime/server/helpers/security.ts:57`).
- **Impact:** low since X2's fix, which covers the rendering. It needs a request
  made by hand from anyone who may use the agent.
- **Fix idea:** decide whether the tamper check should cover what the admin view
  shows.

## X10: Imports and kept formats skip the format check

- **Found:** 2026-10-22, by reading. Not reproduced.
- **Symptom:** none seen. By reading: someone stores HTML under a format they
  may not use.
- **Cause:**
  - **Import:** an import (`transfer blokkli paragraphs`) sets field values with
    the `format` they carry (`src/SerializedParagraphCreationTrait.php:114`),
    without `resolveTextFieldItem()`.
  - **Update:** an update keeps the field's current format
    (`src/Plugin/ParagraphsBlokkli/UpdateFieldValueTrait.php:88`, `:223`). A
    user who may not use that format can still change the field's HTML; core's
    widget disables such a field.
- **Impact:**
  - low in the sandbox, where every format filters and there's no `full_html`;
  - high on a site with `full_html`, or another format that keeps scripts.
- **Fix idea:**
  - Resolve formats on import as the mutations do.
  - For updates: refuse a field whose format the user may not use (decided),
    when the mutation first runs, as the link text's check does; stored
    mutations replay as they did.

## X11: The docs and the playground render titles with `v-html`

- **Found:** 2026-10-22, by reading.
- **Symptom:** a project that copies them has stored XSS on the public site, for
  anyone who may set a title.
- **Cause:**
  - a raw title through `v-html` in:
    - `skills/blokkli-v2-migration/phases/2-nuxt.md:120` (and the lead at
      `:121`);
    - `docs/components/BlokkliEditable.md:111`;
    - `playground/app/components/Hero/index.vue:14`;
  - no page tells projects what they can safely render with `v-html` (a
    `processed` value), or that blökkli writes the diff markup into the element
    itself.
- **Fix idea:**
  - `{{ }}` for plain text.
  - A short docs section on what projects may rely on: blökkli sanitises what it
    previews (since X4's fix).

## X12: `javascript:` URLs reach links and frames

- **Found:** 2026-10-22, by reading. Not reproduced.
- **Cause:**
  - **Pasted HTML** keeps `href`
    (`src/runtime/editor/features/clipboard/helpers.ts:10`) and is shown with
    `v-html` in the drop preview
    (`features/clipboard/DropElement/index.vue:18`). Drupal filters it when it's
    saved.
  - **Comment bodies:** fixed with X3. Drupal's comment format and the editor's
    `comment` profile both drop `javascript:` links.
  - **The iframes module's editor** sets `:src` from the block's value
    (`src/modules/iframes/runtime/features/iframes/Editor/index.vue:12`).
- **Impact:** low: someone has to click, or the project's iframe source has to
  come from content.
- **Fix idea:** the sanitiser allows only `http(s):`, `mailto:` and relative
  URLs. The iframe source is checked the same way.

## Smaller things

- **Violation messages** reach `v-html`
  (`features/publish/Dialog/Violations.vue:53`). Drupal sends them as escaped
  markup. Another adapter's messages need the sanitiser (step 4), or have to
  become text as `getViolationText()` does (from X13, fixed otherwise).
- `FormatTextFieldController`
  (`src/Controller/FormatTextFieldController.php:44`) processes text with any
  format the client names, without checking that the user may use it. Only the
  caller sees the result.
- **Messages to other windows:**
  - `js/rich-text.js:107` accepts `blokkli__editable_field_set_value` from any
    origin (CKEditor's schema filters what it gets).
  - `js/form.js` and the frame's `setValue()` post with `'*'`, so a field's text
    could reach another window.
- The agent's selector replace uses `String.replace()`
  (`src/modules/agent/runtime/app/tools/helpers.ts:316`), which interprets `$&`,
  `` $` `` and `$'` in the replacement. That's a correctness bug.
- Options and behaviour settings are stored without a schema check (F11 in
  [the drupal-setup findings](../drupal-setup/findings.md)). Rendering them is
  up to the site's components.
- **CSP:** the sandbox sends `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
  (`.ddev/nginx_full/nginx-site.conf:100`), so inline handlers run. Nuxt's
  inline payload needs `'unsafe-inline'` unless it uses nonces or hashes.
- **Not XSS, unverified:**
  - Sibling sandboxes are same-site to each other.
  - The middleware's mutation endpoint reads any content type
    (`node_modules/nuxt-graphql-middleware/dist/runtime/server/api/mutation.js:17`).
  - So `SameSite=Lax` may not stop a `text/plain` POST from one sandbox to
    another. Drupal's graphql would refuse it, but the browser never reaches
    Drupal's endpoint directly.

## Decisions

Made with the user on 2026-10-22.

- **blökkli first:** the editor and its Drupal module, `paragraphs_blokkli`. A
  finding is fixed where it's caused, in the module too. What projects do (their
  components, their CSP) comes after.
- **Projects need `v-html` only for rich text** (a formatted field's
  `processed`). Together with a strict CSP and Drupal's text formats, that's
  enough for the public site. blökkli offers no sanitiser for it for now.
- **No sanitising of GraphQL responses in Nitro** (in nuxt-graphql-middleware's
  proxy).
- **The editor's sanitiser is mandatory:** it can't rely on a CSP that every
  project sets up, and the editor itself needs `'unsafe-eval'` today.
- **Admin-written labels are text.**
- **What stays HTML** (decided in X1's round):
  - analyzer descriptions, as documented: the built-in analyzers escape what
    they read from the page;
  - tour texts and add actions' descriptions, which the features write with
    `<p>`;
  - `$t()` texts with `<strong>`: the values put into them are escaped.
- **`InfoBox`'s `text` is text.** Markup goes into its slot.
- **DOMPurify is a dependency** (before step 4). The browsers' `setHTML()` isn't
  in every browser yet. It goes behind `sanitizeHtml()` in
  `src/runtime/editor/helpers/html`, with a profile for each kind of markup, so
  a switch to `setHTML()` later changes one file: `richText`, which covers diffs
  too (`<ins>` and `<del>` are HTML), `markdown` and `comment`. Only editor code
  imports it. The clipboard's `sanitizeHtml()`, which removes attributes, gets
  another name.
- **X4's allowlist is generic:** DOMPurify's HTML profile (no scripts, event
  handlers, `javascript:` URLs, SVG or MathML; classes and data attributes
  stay). It also drops style elements and form controls, which rich text doesn't
  need: a `<style>` would restyle the editor, a form could ask for a password. A
  text format's own list would only bring the previews closer to what Drupal
  renders; consider it if they visibly differ from the saved page.
  `<drupal-media>` disappears from the previews, where it shows nothing today.
- **The diff view's props are HTML, sanitised** (X5): escaping them would show a
  text's rich text as tags. A title with a `<` shows filtered, and nothing in it
  runs.
- **X10: an update of a field whose format the user may not use is refused,** as
  core's widget disables such a field. Switching the format would strip what the
  format allowed (an embed, an iframe) from content someone with more rights
  wrote, for a typo fix. In the sandbox it never triggers: every user may use
  `basic_html` and `table`. Later, the editor could show such a field as locked.

## Vue and Nuxt

Researched on 2026-10-22.

- **Vue** escapes `{{ }}` and bound attributes. It doesn't touch `v-html`, URLs
  (`:href="javascript:…"`), `:style` or `on*` attributes, and names no HTML
  sanitiser
  ([its security guide](https://vuejs.org/guide/best-practices/security.html)).
- **Hydration never sets `innerHTML` again** (`hydrateElement()` in
  `@vue/runtime-core` 3.5.38 patches only events, `value`, `.prop` bindings and
  custom elements). A sanitiser that only runs in the browser changes nothing on
  a server-rendered page, and the page's handlers have run by then anyway.
- **Trusted Types doesn't guard `v-html`:**
  - Vue creates a policy `vue` that passes every string through
    (`createHTML: (val) => val`, `@vue/runtime-dom`) and uses it for `v-html`.
  - Refusing the policy would also break the static content that Vue inserts
    with `innerHTML`.
- **A directive can't render content on the server:** `ssrRenderAttrs()` ignores
  `innerHTML` from `getSSRProps()`.
- **Nuxt** has no HTML sanitiser, only `useHeadSafe()` for the head.
  - Its XSS advisories are about URLs and the head: `<NuxtLink>`, `navigateTo()`
    and `reloadNuxtApp()` with `javascript:`/`data:` URLs, `<NoScript>`, and
    `useHeadSafe()` in server islands
    ([advisories](https://github.com/nuxt/nuxt/security/advisories)).
  - Since 4.6.0 Nuxt checks URLs with the browser's `URL` parser. X12 follows
    that.
  - We have 4.6.1. The islands fix is in 4.6.2, but nothing here uses server
    islands.
- **Nuxt's MDC** renders HTML as VNodes, with its own attribute checks, and had
  three XSS advisories for them (`javascript:` with tabs, `<base href>`, SVG
  `xlink:href` and `data:` iframes). An allowlist from a maintained sanitiser,
  not our own checks.
- **nuxt-security:**
  - Its strict CSP uses nonces (server rendering) or hashes (static builds) with
    `'strict-dynamic'`.
  - Its XSS validator rejects requests whose body or query contain markup. It
    would refuse the editor's own mutations.
- **What a strict CSP doesn't stop:**
  - HTML without script (overlays, phishing links, leaking content through
    images or CSS);
  - script gadgets that `'strict-dynamic'` trusts (DOM clobbering);
  - pages it doesn't cover (Drupal's, which the editor frames on the same
    origin);
  - cached pages with a reused nonce.
- **Sanitisers:**
  - **DOMPurify:** 11.5 kB gzipped, no dependencies. Removes `javascript:` and
    `data:` URLs by default. Needs jsdom on the server; happy-dom isn't safe
    with it.
  - **sanitize-html:** 50 kB gzipped, without a DOM.
  - **ultrahtml's sanitiser:** follows a withdrawn draft and makes no claim
    about untrusted input.
  - **The browser's `setHTML()`:** in Firefox 148 and Chrome 146, not yet
    Baseline.

## Approach

One finding per round.

0. This plan.
1. **An E2E canary** (written 2026-10-22, in `test/e2e-drupal/features/xss/`):
   - **Payloads:** `canaryPayload(id)` in `test/e2e-drupal/support/xss.ts`
     returns each place's payload, which calls `window.__bkXss(id)` when it
     runs. The user fills it in by hand; until then it throws. `installCanary()`
     records the ids that ran.
   - **Values:** the specs store them through the adapter in their own sandbox,
     as a request made by hand would (no fixtures):
     - as text: the page title (`page-title`), a text (`text`, escaped as its
       editor stores it), a title paragraph (`heading`);
     - as raw markup: a text (`raw-text`), a comment (`comment`);
     - in the agent's mock script and prompt: `agent-reply`, `agent-prompt`, and
       `update_text_fields`'s value (`agent-rewrite`).
   - **Places:** page search, the command palette, analyze's heading structure
     (`text-as-html`), the content search (`content-search`, after publishing
     the title), the translate dialog (`raw-markup`), the comments sidebar
     (`comments`), and the agent's rewrite preview, prompt and reply (`agent`).
   - **Not covered yet:** alt texts, the conversations admin, the CSV/PO import,
     the ownership banner, the `markup` inline editor (not reachable with
     Drupal), the frame messages (X7).
   - **Assertions:** each test checks what happens today, that its id ran, after
     the place rendered the value. Unlike `it.fails`, a broken setup can't pass
     for a fix. A run with an empty payload went through every step of all 9
     tests and failed only at those checks.
   - **A fix flips its test:** the place shows the payload as text, and no
     payload ran within a second (`settledCanaries()`).
   - **The E2E sandboxes keep allowing inline handlers:** the canary tests the
     editor, not the CSP.
2. **X1 and X13** (done 2026-10-22):
   - `escapeHtml()` (`src/runtime/editor/helpers/string`);
   - `Highlight` renders segments;
   - the text sinks render with `{{ }}`: the content search's results, tooltips,
     `InfoBox`, `Popup`, the status bullet, a block type's description in the
     add list's help, the label while dragging;
   - markup the editor builds escapes the values it puts in: the ownership and
     translation banners, the publish dialog's dates, the missing component, dev
     mode, the agent's name, the JSON in `State.vue`;
   - the heading structure and axe escape their descriptions;
   - `vue/no-v-html` is on for `src/`. Each remaining `v-html` says why in its
     disable comment, naming the finding where one covers it;
   - the canary's `text-as-html` and `content-search` tests check the fix.
   - **Note:** the sandbox's dev server missed an edit and served the old file
     (the content search's results). After editing many files,
     `ddev nuxt restart` before trusting a run.
3. **X6** (done 2026-10-22):
   - `parseHtml()` (`src/runtime/editor/helpers/html`) parses into a `<div>` of
     a document without a window (`document.implementation.createHTMLDocument`).
     It parses as a `<div>`'s `innerHTML` does, so the diffs split as before;
     `DOMParser` would move a leading `<style>` into `<head>`;
   - the diffs (`parseBlocks()`, `parseListItems()`), the translate dialog's
     `stripHtml()` and the paste use it;
   - `no-restricted-syntax` flags `innerHTML` and `outerHTML` assignments and
     `insertAdjacentHTML()` in `src/`. The ones that stay say why: the parsed
     documents, the copy of a block while dragging, and the editable field
     override's write into the page (X4, X5). The override writes through
     `element[property]` no more, which the rule couldn't see;
   - the canary's `raw-markup` test checks the fix. Its rewrite test now shows
     X4 on its own.
4. **`sanitizeHtml()` (DOMPurify)** in `src/runtime/editor/helpers/html`. Then
   X4 (the handover), X2, X3 (in the module first) and X5, one at a time.
   - **X4** (done 2026-10-22):
     - DOMPurify 3.4.17 is a dependency. `sanitizeHtml(html, 'richText')` uses
       an instance of its own; where DOMPurify can't run, it escapes instead of
       returning the markup as it is;
     - `useEditableFieldOverride()` sanitises what it shows: a formatted field's
       value in every strategy (the element, the props, `<BlokkliEditable>`),
       and every diff. Plain values still go in as text;
     - the `markup` type's inline editor sanitises the stored value it shows;
     - the canary's rewrite test checks the fix;
     - unit tests for the profile. They run in jsdom: DOMPurify doesn't work in
       happy-dom (it drops the first element and keeps forbidden ones), so the
       unit tests moved to jsdom, and happy-dom is gone.
   - **X2** (done 2026-10-22):
     - `renderMarkdown()` sanitises marked's output with the `markdown` profile:
       only what markdown renders (task lists' disabled checkboxes included) and
       the block chips, without images, which could send data out in their URL.
       A spec runs marked's output for every construct through it;
     - the chat, the welcome text and the conversations admin all render through
       it;
     - `.html` attachments are sanitised with `richText`;
     - raw HTML in markdown is sanitised, not escaped: the block chips
       (`linkifyBlockUuids()`) are raw HTML in the markdown. So a tag typed into
       the chat still shows as markup, filtered;
     - the canary's prompt and reply tests check the fix
       (`data-test="agent-user-message"` is new).
   - **X3** (done 2026-10-22):
     - **The cause, in the module:** Drupal stored a comment's body as the
       client sent it and returned it raw, although the schema promised the
       processed body. `body` now resolves to `getProcessedBody()`, the body as
       its format (`blokkli_comment`) filters it. The mutations, the mentions
       and the task toggles keep working on the raw body. A kernel test checks
       it (`CommentExtensionResolversTest::testBodyIsFiltered()`);
     - **the editor too,** for other adapters: the comment renderer sanitises
       the body with the `comment` profile, what the comment editor writes (as
       Drupal's format allows it, plus the emoji's name), before
       `enrichRichContent()` adds the checkboxes;
     - the canary's `comments` test checks the fix.
5. **X12:** `isSafeUrl()` with the `URL` parser.
6. **X7:** sender checks.
7. **The module:** X8, X10, X9.
8. **The CSP:**
   - blökkli works under a strict CSP (no `'unsafe-eval'` for axe-core's
     locales, nonces for what it injects);
   - the sandbox gets one, from Nitro and from Drupal;
   - the directives the editor needs are documented.
9. **Docs:** X11, and what projects may rely on.
