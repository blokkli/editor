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
- **Kept formats** (since X10's fix): an import's texts get formats the user may
  use. A field whose stored format the user may not use for it can't be written
  (`checkTextFormatAccess()`), in any language and through any property, as
  Drupal's widget disables it.
- **Transforms** (since X15's fix) check what the editor offers them for, when
  they're added: the paragraph types and the number that the plugin declares,
  and update access to the paragraphs and the paragraphs that hold them. The
  host's update access is checked for every mutation, when GraphQL loads the
  host. What a plugin changes is the site's to check; the plugin learns the
  first run (`isFirstRun()`) and uses the helper's checks.
- **Agent conversations** (X9, accepted): the agent server refuses to restore a
  conversation whose messages don't match its hash, so the model never sees a
  history that a user made up. What the panel and the conversations admin show
  (`dataUser`) is what the user's editor saved; it's rendered as text and
  sanitised markdown (since X2's fix). The module's README, the schema and the
  agent docs say so.
- **Imported values** (since X14's fix) are validated as an update's are
  (`setValidFieldValue()`), in every language. What a field refuses is left out
  and listed in the import's summary.
- Violation messages come back as escaped markup. The editor renders `errors[]`
  and upload errors as text.
- **Search results** (since X8's fix) are plain text, as the schema says: the
  providers convert only HTML (a formatted text, a context description's tokens)
  and leave plain text as it is.
- Uploads need a CSRF header token. graphql 5 refuses mutations sent as
  `text/plain` or with GET.
- **Parsing** (since X6's fix): `parseHtml()`
  (`src/runtime/editor/helpers/html`) parses in a document without a window; the
  diffs, the translate dialog and the paste use it. The other places parse with
  `DOMParser` (the Drupal adapter, `clipboardData`, `enrichRichContent`, the
  readability checks, `translations/violations.ts`).
- **Pasted HTML** (since X12's fix): `cleanPastedHtml()` removes images and
  every attribute but the `href` of a link to a web page or an email address;
  the drop preview sanitises it with `richText`.
- **URLs** (since X12's fix): `sanitizeHtml()` removes `javascript:` and other
  URLs that run (DOMPurify's own URL check). Where the editor binds a URL from
  content outside it, `isSafeUrl()` (`src/runtime/editor/helpers/url`) checks it
  with the browser's `URL` parser: the paste's links and the iframes module's
  editor, which frames only `http(s):` sources. The other URLs the editor binds
  or opens come from the adapter or its config.
- **Messages between windows** (since X7's fix): the editor accepts a frame's
  messages only from that frame, on the origin of its URL (`isMessageFrom()`,
  `src/runtime/editor/helpers/message`); the preview only from the editor, and
  Drupal's text field frame (`js/rich-text.js`) too. Messages go only to the
  origin they're meant for. BroadcastChannel (`providers/broadcast.ts`) only
  carries events for every tab of the origin.
- **Previews** (since X4's fix): the editable field override
  (`useEditableFieldOverride()`) sanitises a formatted field's value and every
  diff before they reach the page, a project's props or `<BlokkliEditable>`; the
  stored and proposed values keep their markup. So does the inline editor of the
  `markup` type, with the stored value it shows.
- The sandbox's own components render plain text with `{{ }}`, and `v-html` only
  for `processed` rich text.

## Findings

None open. X11, the last, was fixed with the docs (step 9).

## Smaller things

- **Violation messages** reach `v-html`
  (`features/publish/Dialog/Violations.vue:53`). Drupal sends them as escaped
  markup. Another adapter's messages need the sanitiser (step 4), or have to
  become text as `getViolationText()` does (from X13, fixed otherwise).
- **An import's translations kept the reserved fields** (verified and fixed
  2026-10-24): `createParagraphFromSerializedData()` stripped `uuid`,
  `langcode`, `type` and the other fields a payload may not decide
  (`sanitizePayloadValues()`) only from the source language's values, and passed
  a translation's to `addTranslation()`. Core's `createTranslation()` applies
  only translatable fields and sets the language itself, so `id`, `revision_id`,
  `type`, `uuid`, `langcode` and `default_langcode` had no effect.
  `revision_translation_affected` did: a payload could mark a new translation as
  not affected by its first revision. Not XSS. A translation's values now go
  through `sanitizePayloadValues()` too;
  `PayloadValuesGuardTest::testImportTranslationCannotSetReservedFields()` fails
  without it.
- `FormatTextFieldController`
  (`src/Controller/FormatTextFieldController.php:44`) processes text with any
  format the client names, without checking that the user may use it. Only the
  caller sees the result.
- **Search API's fulltext fields:** the Search API provider skips a value that
  isn't a scalar (`SearchApi::mapSearchItem()`). A field of the type "Fulltext"
  gives `TextValue` objects, so a result whose title is mapped to one is
  dropped. Not XSS; found by reading, with X8.
- **The agent's selector replace used `String.replace()`** (fixed 2026-10-24):
  `applySelectorOperation()` read `$$`, `$&`, `` $` `` and `$'` in the agent's
  replacement, so a `$$` lost a dollar sign and the others copied the field's
  own content into the element. Not XSS. It splices by index now, as the plain
  search and replace does; `helpers.spec.ts` ("inserts a replacement with dollar
  signs verbatim") fails without it.
- Options and behaviour settings are stored without a schema check (F11 in
  [the drupal-setup findings](../drupal-setup/findings.md)). Rendering them is
  up to the site's components.
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
- **X9: a conversation's displayed part stays unverified** (2026-10-23). A user
  can make the conversations admin show replies the agent never gave, in their
  own conversations. Nothing runs since X2, and a user could mislead moderators
  with feedback as easily. Verifying in Drupal would mean reproducing the
  browser's `JSON.stringify()` byte for byte, or changing the hash between the
  agent server, the client and Drupal, and would still only cover the server's
  messages, not what moderators look at. Only the agent server storing
  conversations itself would make that trustworthy.
- **X15: the module checks what the editor offers a transform for, not what the
  plugin changes** (2026-10-23). That's site code, which may deliberately allow
  things. The helper has the checks that the mutations run, and the plugin bases
  have `isFirstRun()`, which reads the `is_first_run` key of their
  configuration, as the mutations' does. The mutations set it and don't store
  it. No method was added to the interfaces, so a plugin without a base class
  keeps working.
- **X14: an import leaves out what doesn't validate** (2026-10-23), rather than
  failing as an add does. The import is best effort, as it is for missing
  paragraph types, fields and references, and the summary lists the field. One
  invalid field from another site would otherwise block the whole paste.
- **X10: an update of a field whose format the user may not use is refused,** as
  core's widget disables such a field. Switching the format would strip what the
  format allowed (an embed, an iframe) from content someone with more rights
  wrote, for a typo fix. In the sandbox it never triggers: every user may use
  `basic_html` and `table`. Later, the editor could show such a field as locked.
  - The `.format` path is refused too (2026-10-23): core hides the format
    selector, and blökkli never writes that path.
  - An import coerces instead (2026-10-23): the paste is the editor's write, and
    nothing tells a copy from a crafted payload. So an editor who pastes an
    admin's `full_html` paragraph gets it in `basic_html`.

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
  - Since 4.6.0 Nuxt checks URLs with the browser's `URL` parser. `isSafeUrl()`
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
       `update_text_fields`'s value (`agent-rewrite`);
     - in a CSV file to import: as text for a title (`import-title`), as raw
       markup for a text (`import-text`).
   - **Places:** page search, the command palette, analyze's heading structure
     (`text-as-html`), the content search (`content-search`, after publishing
     the title), the translate dialog (`raw-markup`), the comments sidebar
     (`comments`), the agent's rewrite preview, prompt and reply (`agent`), and
     the import's preview (`import-preview`, added with X5's fix).
   - **Not covered yet:** alt texts, the conversations admin, the ownership
     banner, the `markup` inline editor (not reachable with Drupal).
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
   - **Found later (2026-10-24, by the user):** the drop target's label while
     dragging showed its markup as text (`<span class="bk-is-host">…`): the
     renderer (`dragging-overlay/Renderer`) still built it as markup. It's now a
     list of parts (`DropTargetLabelPart`: host, block or field, and a text),
     which `DragItems` renders as elements with the text in `{{ }}`.
     `features/dragging-overlay/label.test.ts` checks the parts; it failed on
     the markup. A sweep for the same mistake: every markup string the editor
     builds in its scripts, the translations with markup and the docs that
     promise markup (an add action's description) reach a `v-html` that stays,
     with the values escaped. The drag label was the only one.
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
   - **X5** (done 2026-10-22), which finishes step 4:
     - `DiffValue` and `DiffDisplay` sanitise what they show with `richText`:
       the finished diff, both sides of the side-by-side view, the "after only"
       view. Images stay, the diff view styles them;
     - **plain fields as text:** the views' `plain` prop escapes both values
       before diffing. The translate dialog and the CSV/PO import pass it from
       the field's type, the agent's details from `FieldDiffDetailItem.plain`
       (set by the three tools that build them; stored conversations without it
       are sanitised as HTML), and the approval overrides escape before
       `setDiffHtml()`;
     - `mapDiffProps`'s docs say its strings are HTML, sanitised, and that text
       should be escaped;
     - a new canary test, `import-preview`, checks it. It failed with the old
       `DiffValue`.
5. **X12** (done 2026-10-22):
   - `isSafeUrl(url, 'link' | 'frame')` reads the protocol with the browser's
     `URL` parser, against the page's address (not the document's base URL):
     `http(s):` and `mailto:` for links, `http(s):` for frames;
   - the clipboard's cleaner (`cleanPastedHtml()`, formerly a second
     `sanitizeHtml()`) keeps an `href` only on links, and only if it's safe. It
     also removes nested images now, which it skipped;
   - the drop preview sanitises the pasted HTML with `richText`: it kept every
     element, `<style>` and a `<base>` with its `href` among them, which would
     change how the page resolves relative URLs while it's shown. Links in it
     couldn't be clicked (`pointer-events: none`);
   - the iframes module's editor frames the block's source only if it's safe,
     and says so otherwise. The project's own `<iframe>` in `<BlokkliIframe>`
     loads the same source on the page: that's for the docs (step 9);
   - unit tests, no canary: the canary's payload didn't run in the paste preview
     before the fix either.
6. **X7** (done 2026-10-23):
   - `isMessageFrom(e, source, origin)` (`src/runtime/editor/helpers/message`)
     accepts a message only from the expected window, on the expected origin.
     `getUrlOrigin()` (`helpers/url`) reads a frame URL's origin against the
     page's address; an opaque one counts as none;
   - the text field's frame, the edit form and the nested editor accept only
     their iframe's messages, from the origin of the frame's URL. The window
     stays the same when a form redirects after saving. Content in the nested
     editor's slot has no frame, so it gets no messages;
   - the preview accepts only the editor's: its parent, on its own origin. The
     editor posts to it without a target origin, which means its own origin;
   - the text field frame's `setValue()` posts to the frame's origin instead of
     `'*'`;
   - **in the module:** `js/rich-text.js` accepts `set_value` only from its
     parent, on its own origin. `js/form.js` posts without a target origin, as
     `redirect.js` and `rich-text.js` already did. It only sent heights, the
     dialog's width and "cancel", not a field's text. An editor on another
     origin couldn't use the module's frames before either: Drupal sends
     `X-Frame-Options: SAMEORIGIN`, and the other scripts posted to their own
     origin;
   - not BroadcastChannel instead: it's same-origin too, but every tab of the
     origin gets every message, and the protocol with the module would change;
   - `features/xss/messages.test.ts` posts a text field's messages and an option
     change from a frame of its own. Both tests failed without the editor's
     checks, and the set-value check failed without `rich-text.js`'s.
7. **The module** (done 2026-10-23): X8, X10, X14, X15, X9.
   - **X8** (done 2026-10-23):
     - the schema describes the search items' and media items' titles, texts and
       contexts as plain text;
     - plain text stays as it is: labels, a string field's text, the default
       context and the one an entity provides. Stripping tags cut it: "a < b"
       survived, but "a<b" became "a" and "Fish & Chips <3" lost its end;
     - HTML becomes text, its tags stripped, then its entities decoded: a
       formatted field's text, which the entity query decoded first and so lost
       a typed `<b>`, and a context description, whose tokens Drupal escapes
       (the editor showed `&amp;`);
     - the Search API provider can't tell what an index field holds. It keeps
       the title and the context, which the module's own processor indexes as
       plain text, and treats the text as HTML;
     - kernel tests: `SearchResultTextTest` (the entity query, the context) and
       `SearchApiResultTextTest` (Search API, the context processor). All three
       failed with the old code.
   - **X10** (done 2026-10-23):
     - reproduced first with probe kernel tests, and with a second, independent
       read of every path that writes a text;
     - the update trait's two write methods refuse, on the first run, a field
       whose stored format isn't one the user may use for it
       (`checkTextFormatAccess()`, core's rule). The check runs after the
       language is chosen, so a new translation's copied format counts. That
       covers `update_field_value`, `update_host_entity_field_value`,
       `bulk_update_field_values` and `bulk_translate_field_values`, through any
       property;
     - an import resolves every text of the envelope on the first run (every
       language, non-translatable values, nested paragraphs), and stores the
       result;
     - `resolveTextFieldValue()` tells a list from a single item by its first
       key, as Drupal does, so a list with other keys gets formats too;
     - `UnusableTextFormatTest`: eight updates, the import and the list failed
       with the old code. Someone who may use the format keeps writing, and
       stored mutations replay as they did. `UpdateFieldValueTest` now installs
       the filter config: its `plain_text` text didn't exist.
   - **X14** (done 2026-10-23):
     - on the first run, the import sets each value on a draft paragraph and
       validates it with `setValidFieldValue()`, in the same pass that resolves
       the formats. That's every language, with a draft for each, so a value
       left out in one language doesn't count as a known violation in the next;
     - a value that adds a violation, or that Drupal can't set, is left out of
       the stored envelope and listed as a dropped field, once per paragraph. A
       replay applies only what passed;
     - the summary dialog's help text and the schema's description say a dropped
       field may also have had a value that isn't valid;
     - `ImportValidationTest`: a link to `javascript:void(0)`, a raw `target_id`
       that the field doesn't take, and a title too long in the translation
       only. That failed with the old code. Valid values are kept, and a stored
       import replays as it did. `ImportMutationTest`'s large pastes now go into
       a `string_long` field: 70,000 characters don't fit a `string`.
   - **X15** (done 2026-10-23):
     - the plan's premise was partly wrong: the host's update access is checked
       for every mutation, when the GraphQL entry loads it
       (`entity_load_by_uuid` with `access_operation: update`). What `transform`
       lacked were the checks of the paragraphs;
     - on the first run, `transform` checks the plugin's `bundles`, `min` and
       `max`, as the editor offers it (`features/transform/index.vue:40`), that
       the paragraphs exist, and update access to them and to the paragraphs
       that hold them. `applies()` isn't checked: it needs the editing language,
       which the mutation doesn't get, and decides where a transform is offered;
     - both plugin bases have `isFirstRun()`. The interfaces' `transform()` says
       what the mutation checks and which helper methods a plugin uses for the
       rest;
     - `TransformAccessTest`, with the test module
       `paragraphs_blokkli_transform_test`: a type the user may not update, a
       paragraph in one, an undeclared type, a missing paragraph, too few and
       too many paragraphs, and the first run of both kinds of plugin. Eight of
       nine failed with the old mutations; a stored transform replays as it did.
   - **X9** (accepted 2026-10-23):
     - confirmed: the upsert stores everything as sent, and Drupal doesn't check
       the hash, though it knows the secret (`auth_secret`, which the tokens use
       too). The agent server checks the hash on restore
       (`restore_conversation`). Only the owner and the two admin permissions
       read a conversation; the admin's detail renders `dataUser` through the
       panel's history, whose markdown goes through the sanitiser;
     - documented in the module's README ("Conversations"), the schema's
       descriptions of `hash`, `dataUser` and `dataServer` (which called the
       hash the frontend's), and the agent docs' architecture and adapter pages.
       The adapter page's type comments called the hash part of the server
       state.
8. **The CSP** (surveyed 2026-10-23). The goal: the strictest policy, so that
   blökkli works on projects that have one.
   - **Today:** nginx sends `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
     for every response (`.ddev/nginx_full/nginx-site.conf:100`), so inline
     handlers run.
   - **The probe:**
     - a temporary Nitro plugin in `sandbox/frontend` (deleted again) sent the
       policy below in report-only mode, with a nonce per response. It added the
       nonce to the tags of Nuxt's head and body append, and a
       `<meta property="csp-nonce">` for Vite;
     - the whole E2E suite ran under it on the dev server: 1,718 reports, kept
       in `tmp/csp-probe/reports.jsonl` (gitignored). One agent spec
       (`features/agent/ask-then-add`) timed out under the extra requests and
       passes alone;
     - the policy:

       ```
       default-src 'none'; script-src 'nonce-…' 'strict-dynamic';
       style-src 'self' 'nonce-…'; img-src 'self'; font-src 'self';
       connect-src 'self'; frame-src 'self'; media-src 'self';
       manifest-src 'self'; form-action 'self'; frame-ancestors 'self';
       base-uri 'none'; object-src 'none'; require-trusted-types-for 'script'
       ```

     - Nuxt's inline scripts and every chunk loaded with the nonce and
       `'strict-dynamic'`. Once its styles are fixed, blökkli needs no nonce of
       its own: the plan's premise ("nonces for what it injects") was wrong;
     - vue-echarts' styles weren't reported: CSP doesn't cover constructable
       stylesheets (`adoptedStyleSheets`). Nothing needed `data:`, a worker or
       another host, except the YouTube thumbnail below.

   - **blökkli's scripts:**
     - zod 4 tries `new Function` once per editor load (`allowsEval`), and
       compiled an object schema on three pages. Enforced, it falls back, but
       every load sends a report. zod's switch for strict CSPs is
       `z.config({ jitless: true })`;
     - axe-core compiles a German, French or Italian locale's `failureSummaries`
       with `new Function` in `axe.configure()`
       (`features/analyze/analyzers/axe.ts:101`). Checked in Node: two calls per
       locale, none for English or for the locale's other parts. Enforced, the
       accessibility check fails on those pages. The suite doesn't run into it.
   - **blökkli's styles:**
     - TipTap adds its base CSS as a `<style>` element (`injectCSS`, on by
       default; `components/RichText/Editor/index.vue:320`);
     - `icons/svg/loader.svg` has a `<style>` element (its animation),
       `icons/svg/spinner.svg` a `style="opacity: 0.3"`. The icons are rendered
       as markup, so both are blocked.
   - **blökkli's images:**
     - `blob:` for the previews of the upload dialog and the clipboard;
     - the clipboard's YouTube preview loads
       `http://i3.ytimg.com/vi/<id>/hqdefault.jpg`
       (`features/clipboard/DropElement/Video.vue:26`): over http, and a request
       to Google for every pasted link.
   - **Trusted Types** (Baseline since February 2026), sinks without a policy:
     - blökkli's: `parseHtml()` (`helpers/html/index.ts:16`), the editable field
       override (`composables/useEditableFieldOverride.ts:170`), and `DOMParser`
       in `features/analyze/readability/chunkHtml.ts:96`, the readability
       indicator
       (`features/editable-field/Overlay/ReadabilityIndicator/index.vue:62`),
       `features/translations/violations.ts:9` and the Drupal adapter
       (`src/modules/drupal/runtime/adapter/index.ts:180`);
     - the dependencies': TipTap and ProseMirror (`DOMParser`, the style
       element), turndown (`DOMParser`), ECharts (`innerHTML = ''`) and zod
       (`Function`). Only a `default` policy covers those, and that's the
       project's;
     - `v-html` goes through Vue's policy `vue`, which passes everything.
       DOMPurify has its own.
   - **Not blökkli's:**
     - dev tooling, which doesn't ship: Nuxt devtools' web component (its
       styles), Nuxt's dev error overlay (inline styles, and its markup and
       script through `innerHTML` and `textContent`), Vue devtools (a script);
     - Drupal's pages weren't in the probe. The node form has no inline script
       that runs (only JSON blocks, and scripts from its own origin) and no
       style attributes, so `script-src 'self'` covers them. The module's own JS
       and templates add nothing inline. CKEditor 5 needs
       `style-src 'unsafe-inline'`
       ([CKEditor's CSP page](https://ckeditor.com/docs/ckeditor5/latest/getting-started/setup/csp.html)).
       The `csp` module's repository has a change that adds it with CKEditor's
       libraries; not checked against a release.
   - **Not covered by the probe:** the production build (Vite's preload links
     read the nonce from `<meta property="csp-nonce">`), the framed Drupal forms
     (only nginx's policy), ECharts' tooltips (HTML with style attributes), axe
     in German, French or Italian. The build is covered since step 1, axe in
     German since step 2.
   - **The order** (corrected after the decisions: enforcing everything at once
     would break the sandbox and every spec until the fixes are in):
     1. the sandbox gets its policy from nuxt-security: `nonce: true`, the
        policy above without Trusted Types in the build, the looser one in
        `$development`. Its XSS validator and rate limiter are off for the
        editor's routes, its request size limit stays as projects have it. nginx
        stops sending its policy for Nuxt's responses. The E2E suite fails a
        spec on any violation (`securitypolicyviolation`), except a list of the
        known ones, each tied to its fix. The run against the build checks
        Vite's preloading, since nuxt-security adds the `<meta>` only in dev.
        **Done (2026-10-23):**
        - written: nuxt-security 2.6.0 in strict mode with the policy
          (`sandbox/frontend/nuxt.config.ts`; the dev server's styles are
          computed from `NODE_ENV`, since `$development` would merge the
          arrays), HSTS off (the proxy's), the rate limiter off (behind nginx
          every request comes from 127.0.0.1), the XSS validator off for
          `/api/graphql_middleware/**` and `/api/blokkli/agent/**`. nginx adds
          its policy only to responses without one
          (`$upstream_http_content_security_policy`): Drupal's, the control
          app's, its own. The check: `test/e2e-drupal/support/csp.ts` (the known
          list) and `test/e2e-drupal/setup.ts` (after every test and file);
          `openEditor`, `openPage` and the preview grant's visitor install it.
          Proved by taking zod's entry out: the spec failed with its violation;
        - the dev server: 431 of 431 pass. The build: 424 of 431 pass, no
          unknown violation. Vite's preloading works without the `<meta>`;
        - **COEP** (decided and built 2026-10-23, option 2). Strict mode sends
          `Cross-Origin-Embedder-Policy: require-corp` in builds (its default
          mode sends `credentialless`). Chromium then refuses to frame Drupal's
          pages (`net::ERR_BLOCKED_BY_RESPONSE`): the frame editor, the edit
          forms, the backend editor in the translate dialog. The seven failing
          tests all time out on those frames. A framed page that sends COEP
          (`credentialless` or `require-corp`) loads; checked with a faked
          header, same origin only. Investigated (option 2: the module sends
          COEP on the pages the editor frames):
          - the framed pages are the module's routes under
            `/paragraphs_blokkli/`, with `?paragraphsBlokkli=true`, and
            `paragraphs_blokkli.redirect`, where saved forms end up.
            `paragraphs_blokkli_preprocess_html()` already treats them as
            framed. The module doesn't touch `X-Frame-Options`, so core's
            `SAMEORIGIN` limits it to the same origin today;
          - a matrix in Chromium 150 and Firefox 150 (Playwright, routes faked):
            under an embedder with `require-corp` or `credentialless`, a framed
            page without COEP is blocked, on any origin. On another origin (same
            site or another site) it also needs
            `Cross-Origin-Resource-Policy: cross-origin`. Inside the framed
            page, Firefox blocks a cross-origin image without CORP under
            `require-corp` and loads it under `credentialless`. Chromium loaded
            it either way, which faked responses may cause;
          - Safari has no `credentialless` (MDN's compat data; Chrome 96,
            Firefox 119). It reads a framed page's `credentialless` as no COEP,
            so under an embedder with `require-corp` (nuxt-security's strict
            mode, which Safari supports since 15.2) it blocks the frame. An
            embedder's `credentialless` (nuxt-security's default) it ignores, so
            the frames load. WebKit doesn't run here (missing system libraries),
            so that's from the docs only;
          - two COEP headers count as none in both browsers, even with the same
            value: a site whose web server or CDN already adds one has to turn
            the module's off;
          - built in the module: `FrameEmbedderPolicySubscriber` sends the
            container parameter `paragraphs_blokkli.frame_embedder_policy`
            (default `credentialless`; `require-corp`, or `false` for none) with
            the main response of a route under `/paragraphs_blokkli/` or a
            request with `paragraphsBlokkli`, error pages included, and leaves a
            header the response already has. The module's README has a section
            on it. `FrameEmbedderPolicySubscriberTest` (14 cases) and
            `FrameEmbedderPolicyTest` (through the kernel; two of three failed
            without the service);
          - the sandbox sets `require-corp` in `sandbox/drupal/services.yml`
            (`container_yamls` in settings.php), to match its frontend and
            Safari. The E2E template's fingerprint now covers both service
            files: the template caches the container. The build: 431 of 431
            pass;
        - found on the way: nuxt-security 2.6.0's XSS validator crashes every
          request it checks with `xss` 1.0.16 (published 2026-10-20,
          nuxt-security#767): `xss` is pinned to 1.0.15 in the root
          `package.json`'s `overrides`, until nuxt-security fixes it. Its
          `removeLoggers` does nothing under Vite 8 (it sets esbuild's `drop`,
          which oxc ignores);
     2. blökkli's fixes, each removing its entries from the list. **Done
        (2026-10-23)**, all five in one round; the list is empty:
        - zod: the agent module's client plugin
          (`src/modules/agent/runtime/app/plugins/zod.ts`) sets
          `z.config({ jitless: true })` when the app starts. In the agent
          feature's setup it came too late: each schema reads the setting when
          it's built, and the sandbox's `test-cases` feature imports every tool
          (`mcpTools`) with the editor's main chunk. The editor's entry can't
          set it either: the package is `"sideEffects": false`, so a bundler may
          drop an import that's only there for its side effect. The setting is
          zod's global one, on every page of the project (client only; the
          server keeps compiling);
        - axe: the locale's failure summaries are passed as functions, which axe
          takes as they are (`withoutTemplates()` in
          `features/analyze/analyzers/axe.ts`): the heading from the template,
          then the messages as axe's template indents them. A summary of another
          shape is left out, and axe uses its English one. `axe.spec.ts` runs
          axe in jsdom with de, fr and it, compiled and not: the same summaries
          of both kinds, no `new Function` (it failed with two calls per locale
          without the fix). `test/e2e-drupal/features/analyze/axe.test.ts` runs
          the analysis on the German translation under the policy (the button
          got `data-test="analyze-run"`); without the fix it failed on the eval
          violation and got no results;
        - TipTap: `injectCSS: false`, its base CSS in
          `css/partials/rich-text.css`. ProseMirror's classes are attribute
          selectors (`[class~='ProseMirror-gapcursor']`): the build prefixes
          every class selector that doesn't start with `bk-`. Checked in the
          editor: the computed styles apply, and there's no style element;
        - the icons: `loader.svg` animates with SMIL (`<animate>`), which CSP
          doesn't cover; the radii match the CSS animation's at every 50 ms, in
          Chromium and Firefox. `spinner.svg` has `opacity="0.3"`;
        - the YouTube thumbnail comes over https from `i.ytimg.com` (decided
          with the user: keep it). The sandbox's `img-src` allows the host, and
          `openEditor` answers its requests with an image of the fixtures, so
          the tests don't reach YouTube. An image that doesn't load (a policy
          without the host) is hidden: the item shows the provider's icon and
          the URL, as Vimeo's and TikTok's do. The paste spec checks that the
          thumbnail loads; with the old `http://i3.ytimg.com` it failed (the
          policy upgrades it to https, and blocks the host);
        - the e2e-testing, styles and icons skills say what the policy blocks;
        - found on the way:
          - blökkli's Vite plugin finds an SFC's style blocks with a regex
            (`src/build/mangleTransform.ts:380`), so the text `<style>` in a
            script comment took the template for CSS, and the component didn't
            compile. Worked around (the comment says "style element"), not
            fixed;
          - axe gets the content's language, not the interface's, and keeps the
            locale of its first run when the language changes;
          - the sandbox's pages have no `<title>` (axe's `document-title`);
          - the placeholder rule in `rich-text.css` is dead: the rich text
            editor has no placeholder extension;
     3. Trusted Types: a `blokkli` policy for the editor's sinks, and a
        DOMPurify `default` policy in the sandbox for the dependencies, as a
        project that enforces them would have. Then the build's policy gets
        `require-trusted-types-for 'script'`; **Inventory (2026-10-23):** the
        build with a report-only
        `require-trusted-types-for 'script'; trusted-types vue dompurify blokkli default`
        through the whole suite: 1,446 reports from eleven places. Nothing from
        Nuxt, Vue (`v-html` goes through its policy) or DOMPurify, no other
        policy name, no duplicate. Every place, with the source searched for
        what the suite doesn't reach:
        - blökkli's, reached: `parseHtml()` (`helpers/html/index.ts:19`,
          `innerHTML` of an inert document's element), `chunkHtml()`
          (`readability/chunkHtml.ts:114`, on every editor load), the
          readability indicator (`ReadabilityIndicator/index.vue:160`),
          `translations/violations.ts:11` and the Drupal adapter
          (`adapter/index.ts:262`), all parsing with `DOMParser`; and
          `useEditableFieldOverride.ts:271`, sanitized markup into the page;
        - blökkli's, not reached by the suite: `clipboardData/index.ts:125`,
          `RichText/Renderer/enrichRichContent.ts:21` and the agent's
          `tools/helpers.ts:300` and `:326` (parsing), and
          `BlockPreviewRenderer/Item.vue:52`, which copies a page element into
          the page through its `outerHTML`;
        - the dependencies': TipTap (`elementFromString()`, `<body>…</body>`),
          turndown (an empty probe, then `<x-turndown id="turndown-root">…`) and
          ECharts' SVG renderer (`innerHTML` `''` and `null`, on dispose and
          clear);
        - the known list can't name blökkli's places: the chunks' names change
          with every build, and the samples (the sink and the value's first 40
          characters) look alike. The dependencies' samples are stable;
        - a `default` policy takes every string sink that comes without a
          trusted value, blökkli's too: with the sandbox's in place, the suite
          wouldn't notice a sink of blökkli's that misses its policy;
        - the lint rule against `innerHTML`, `outerHTML` and
          `insertAdjacentHTML` (`eslint.config.mjs`, X6) doesn't cover
          `DOMParser`.

        Two rounds (decided 2026-10-23): first the `blokkli` policy, with the
        report-only policy in the build and known entries for the dependencies
        only; then the sandbox's `default` policy, which records its calls so
        that the check still sees a sink of blökkli's without the policy, and
        enforcement.

        **Round 1, done (2026-10-23):**
        - the policy is in `helpers/html` and never leaves it (`getPolicy()`):
          it passes markup through, for documents without a window, and for what
          DOMPurify returns. Its `createScriptURL` throws. If the page refuses
          the name, the editor passes strings;
        - the helpers: `parseHtml()`, `parseHtmlDocument()` (instead of
          `DOMParser`), `setInertHtml()` (throws for an element of a document
          with a window), `setSanitizedHtml()` (DOMPurify's TrustedHTML, for the
          page), `sanitizeHtml()`. The editor's DOMPurify instance gets the
          policy (`TRUSTED_TYPES_POLICY`): blökkli creates one policy, and a
          project allows only `blokkli` for it, not `dompurify`;
        - the other places use them: the seven `DOMParser` calls, the agent's
          `applySelectorOperation()` (`setInertHtml()`) and the field override
          (`setSanitizedHtml()`, which now sanitises in `writeDom()`).
          `BlockPreviewRenderer` copies the element with
          `cloneWithInlineStyles()` as nodes: no markup, and no style attributes
          for the policy to refuse;
        - the lint rule also forbids `new DOMParser()`;
        - the unit spec of `helpers/html`: the policy is created once as
          `blokkli`, the parsers and DOMPurify go through it (it failed without
          them), a refused name leaves strings;
        - the build sends the report-only policy (a route rule in
          `sandbox/frontend/nuxt.config.ts`: nuxt-security sends no report-only
          one). `support/csp.ts` knows the three dependencies by their samples
          and records the column of a violation;
        - found on the way: the drag overlay renders `getDropElementMarkup()`
          with `v-html` (`dragging-overlay/DragItems/DragItem.vue`). A drag from
          the structure sidebar gets `cloneElementWithStyles()`'s markup, all
          computed styles as `style` attributes, which the strict policy
          refuses: its preview has no styles. Neither that nor the dialogs of
          `BlockPreviewRenderer` ("make reusable", "create template") has a
          spec. **Fixed (2026-10-24):** the overlay gets a copy as nodes
          (`dom.getDropElementClone()`, which replaces `getDropElementMarkup()`)
          and inserts it with `replaceChildren()`. The copy is outside the
          element's ancestors, whose styles can apply to it (a teaser list's
          `.teaser-list > .teaser`, inherited properties), so it gets the
          computed styles (`cloneWithInlineStyles()`):
          - a block keeps its attributes too (`keepAttributes`), as a plain
            clone does, for its pseudo-elements: their rules can select on a
            class or an attribute, and the sandbox's placeholders show one
            (`content: attr(data-placeholder)`, the empty title of a teaser
            list). Pseudo-elements whose rules depend on the ancestors are still
            lost. From 2024 until `9f3247260` (2025-11-02), blocks had the
            computed styles without attributes, since then plain markup;
          - a structure sidebar item gets them without attributes, as before:
            its styles are nested under the sidebar (`.bk.bk-structure`);
          - above 80 elements, computing them lags: a block then gets a plain
            `cloneNode()`, a structure item the fallback, as before;
          - the editor's lists' items (add list, media library, search, library)
            get `cloneNode()`: they're styled for the overlay.

          `cloneElementWithStyles()` is gone. Without `keepAttributes`,
          `cloneWithInlineStyles()` now removes data attributes instead of
          emptying them, which the overlay's regex did.
          `features/dragging-overlay/copy.test.ts` drags a widget (its title's
          colour is a style attribute), a text in columns with a project's
          styles (a constructed stylesheet: a colour for the text inside the
          columns, a `::before` from its class), a teaser list without a title
          (`content/nodes/teasers.yml`, its placeholder) and a structure sidebar
          item (`data-test="structure-item"`). Against a build without the fix,
          the widget's and the structure item's tests fail on the copy's styles
          and on `style-src-attr`. The text's colour fails with a plain clone,
          its `::before` without the classes, the teaser list's placeholder
          without the data attributes (found by the user in the browser). The
          build: 436 of 436. On the dev server, 435 of 436: the ownership spec
          (no drag) timed out and passes on rerun;

        **Round 2, done (2026-10-23):**
        - the sandbox's `default` policy (`app/plugins/trustedTypes.client.ts`)
          gives a string DOMPurify's result, as a project's would. turndown
          wraps its markup in `<x-turndown id="turndown-root">` and looks it up
          again, so DOMPurify keeps that tag (`ADD_TAGS`). DOMPurify's own
          policy (`dompurify`) parses for it, so the default policy doesn't call
          itself;
        - `support/csp.ts` wraps `trustedTypes.createPolicy()` for `default` in
          the test's init script and records every call, with the sink, the
          value's beginning and the calling frame. `DEPENDENCIES` expects
          TipTap's, turndown's and ECharts'; any other call fails the test.
          Checked against a build with `chunkHtml()` back on `new DOMParser()`:
          the editor on the page "Blocks" reported its texts (the page "Blank"
          has none, and passed);
        - the build's policy has `require-trusted-types-for 'script'` and
          `trusted-types vue dompurify blokkli default`, the dev server neither.
          The report-only header is gone, and the known list is empty again;
        - the build: 432 of 432 pass;

     4. Drupal's pages get their policy from the `csp` module. **Done
        (2026-10-23):**
        - the probe: `csp` 2.2.4 with the policy below and Trusted Types in
          report-only mode, next to nginx's loose policy. The suite ran under
          it, and a script visited 49 of Drupal's pages as the admin. No script
          needed more than `'self'`. What it reported:
          - 2,922 Trusted Types reports: core's jQuery, htmx and Drupal.theme,
            CKEditor 5, Gin;
          - `data:` images: Claro's and Gin's icons (in their CSS) and
            environment_indicator's favicon;
          - styles: CKEditor 5's, which the module allows (`'unsafe-inline'` on
            pages with `core/ckeditor5`, `CoreCspSubscriber` in 2.2.4). htmx's
            indicator styles (a style element, also on the link paragraph's
            form; core doesn't use the class). Core's dialog container
            (`style="display:none"` through `insertAdjacentHTML`, empty).
            Claro's sticky bar on listings (`tableselect.js`, a style element),
            environment_indicator's toolbar colours and a `display:none` in
            Views UI;
          - on the dev server, Vue devtools injects a script into same-origin
            frames (`detectIframeApp`);
        - decided with the user: no Trusted Types on Drupal's pages. Strict
          styles, with the module's exception for CKEditor 5: some admin pages
          lose the styles above. htmx is told not to add its styles;
        - written: `csp` in `sandbox/drupal/composer.json` and in `config/sync`,
          enforced, report-only off (`csp.settings.yml`):

          ```
          default-src 'none'; script-src 'self' 'report-sample';
          style-src 'self' 'report-sample'; img-src 'self' data:;
          font-src 'self'; connect-src 'self'; frame-src 'self';
          media-src 'self'; manifest-src 'self'; worker-src 'self';
          object-src 'none'; base-uri 'none'; form-action 'self';
          frame-ancestors 'self'
          ```

          `blokkli_playground` adds `<meta name="htmx-config">` with
          `includeIndicatorStyles: false` (`Hook/HtmxHooks.php`), as a strict
          project would. `support/csp.ts` ignores Vue devtools' script
          (`DEV_TOOLING`). nginx's policy is unchanged, now only for the control
          app, its own pages and the files it serves;

        - the module needs no change: its JS and templates have no sinks and
          nothing inline (`redirect.js` is a file for that reason);
        - the suite: 432 of 432 against a build. On the dev server, 431 of 432:
          an analyze spec timed out (no Drupal page) and passes alone. Without
          the htmx meta, the link paragraph's form fails on htmx's style element
          (`publish/nested`);
        - found on the way: `composer audit` reports core 11.4.7
          (SA-CORE-2026-014, critical, remote code execution; SA-CORE-2026-015
          and -016, cross-site scripting), Gin 5.0.15 (SA-CONTRIB-2026-219,
          cross-site scripting) and view_unpublished (SA-CONTRIB-2026-235,
          access bypass). Not updated here;

     5. the docs: the directives the editor needs, and for nuxt-security the
        routes that need its XSS validator and rate limiter off, and that it
        adds the nonce to the rendered page too. COEP: what the module sends and
        when to change its parameter (`require-corp` for Safari under a
        `require-corp` frontend, `false` when the web server adds the header),
        and that a Drupal on another origin also needs CORP and has to allow the
        framing. That the agent module sets zod's `jitless` for the whole
        client, and that the clipboard's YouTube thumbnail needs
        `img-src https://i.ytimg.com`. Trusted Types: `blokkli` in
        `trusted-types` (and `vue` for Vue's), and a `default` policy for
        TipTap, turndown (which needs its `<x-turndown>` kept) and ECharts.
        Drupal's side: the module's pages need `script-src 'self'` and nothing
        inline, `frame-ancestors` has to allow the frontend, and the `csp`
        module allows CKEditor 5's styles; core's htmx adds a style element
        unless `includeIndicatorStyles` is off. **Done (2026-10-24):**
        `docs/security.md`, one page (decided with the user), with Drupal's side
        as a section of it ("Content-Security-Policy", "Framing", "Drupal"). The
        policy and the nuxt-security config are the sandbox's. The Drupal
        module's configuration page, the agent's quick start and the iframes
        module's setup link to it.

   - **Decided** with the user, one at a time:
     - **decided 2026-10-23:** Trusted Types are enforced in the end state.
       blökkli's sinks get a policy `blokkli` (its parsers pass through, the
       page gets DOMPurify's TrustedHTML). Projects need
       `trusted-types vue dompurify blokkli default` and a `default` policy for
       TipTap/ProseMirror, turndown and ECharts; the sandbox defines one with
       DOMPurify, as a project would;
     - **decided 2026-10-23:** the dev server gets a looser policy, so that Nuxt
       devtools and the error overlay keep working: styles with
       `'unsafe-inline'` and without the nonce, no Trusted Types. Scripts stay
       strict (nonce and `'strict-dynamic'`), which the dev tooling passes. What
       counts is the E2E suite against a build, which gets the full policy.
       Found while deciding:
       - Vite 8's overlay works under the full policy (`createElement`, and the
         nonce from the `<meta>`);
       - Nuxt's overlay (`my-bad`) fails on Trusted Types (Nuxt's plugin mounts
         it with `template.innerHTML`, `my-bad` renders with `innerHTML`) and on
         its `<style>` without a nonce; its script loaded in Chromium. Nuxt
         devtools fails on its web component's styles and Vue devtools' injected
         script;
       - nuxt-security and Nuxt's pending CSP support (nuxt/nuxt#32242) keep
         `style-src 'self' https: 'unsafe-inline'` in their strict mode, and
         have no Trusted Types. Next.js's docs relax the policy in development;
     - **decided 2026-10-23:** the sandbox uses nuxt-security, which is how Nuxt
       projects mostly get a strict CSP, so its quirks show up in the sandbox.
       Its other features are configuration (`rateLimiter: false`,
       `xssValidator: false`, per route through `routeRules`). Found while
       deciding (`src/runtime/nitro/plugins/40-cspSsrNonce.ts`,
       `src/runtime/server/middleware/xssValidator.ts`; Nuxt's pending CSP
       support has the same nonce plugin):
       - it adds the nonce to every `<script>`, `<style>` and `<link>` of the
         page, the rendered `body` included: a `<script>` that reaches a
         server-rendered page through `v-html` gets the nonce and runs. The
         editor's SPA shell has an empty `body`;
       - it adds the `<meta property="csp-nonce">` only in dev;
       - its XSS validator turns every GET's query and POST's body into JSON,
         runs the `xss` library's filter over it and answers 400 if anything
         changed: a `class` on a `<p>`, a mention's `data-` attributes, the
         diff's `<ins>`/`<del>`, or the `<` in "Fish & Chips <3". It would
         refuse most of the editor's GraphQL requests, which go through
         nuxt-graphql-middleware's routes;
       - its rate limiter allows 150 requests per IP in 5 minutes.

9. **Docs:** X11, and what projects may rely on. That includes the iframes
   module: the project checks the source it frames itself (`<BlokkliIframe>`
   only passes it to the editor). **Done (2026-10-24):**
   - `docs/security.md`, "Rendering content": text with `{{ }}`, `v-html` only
     for rich text the backend filtered; what the editor sanitises while editing
     (formatted fields' previews, diffs) and what it doesn't (plain values reach
     props and slots as typed); the strings from project code that it renders as
     HTML (analyzer descriptions, `mapDiffProps`, tour texts, add actions'
     descriptions, the grid markup, violation messages in the publish dialog);
     embeds;
   - X11: the title in `BlokkliEditable.md` and the playground's `Hero` renders
     its emphasized parts from the template; the title and lead in the v2
     migration skill, and the lead in `drupal/pages.md` and `drupal/faq.md`,
     with `{{ }}`. `BlokkliEditable.md`'s rich text example says what it may
     hold. The other `v-html` in the docs, skills and playground render rich
     text (texts, tables) or project code (the grid);
   - found on the way, confirmed and fixed (2026-10-24): `<BlokkliIframe>` wrote
     its height rules with `useHead()` (a style element) and had a static
     `style="container-type: inline-size"`.
     - In the browser, unhead's style element has no nonce: against the build,
       `style-src-elem` blocked it, and unhead set its CSS through `innerHTML`,
       which went to the default Trusted Types policy. The slot was 150px
       instead of 500px.
     - Server-rendered, `style-src-attr` refused the attribute (a probe in
       Chromium), so the `@container` rules had no container and the largest
       width's height applied everywhere. The style element was fine there:
       nuxt-security adds its nonce to every style element it renders.
     - Fixed: `container-type` is a rule of the generated CSS. In the browser
       the rules are a constructable stylesheet (`adoptedStyleSheets`,
       `replaceSync()` when the heights change); on the server they stay in
       `useHead()`. Adopted stylesheets come after the document's in the
       cascade, so they win over the server's element, which unhead leaves in
       place (it only removes elements of its own entries).
     - Tested: `nodes/embeds.yml` (an embed of the fee calculator) and
       `features/iframes/heights.test.ts` (the slot's height for its width, and
       after a change of the heights). Against the build, the first failed
       without the fix; both pass with it. The suite renders nothing on the
       server, so that side is a probe: the generated CSS in a nonce'd style
       element at three widths, then a client stylesheet without one of the
       breakpoints; every height right, no violation.
