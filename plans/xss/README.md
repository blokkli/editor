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

| #   | Finding                                                                                                               | Project | Severity | Status    |
| --- | --------------------------------------------------------------------------------------------------------------------- | ------- | -------- | --------- |
| X11 | [The docs and the playground render titles with `v-html`](#x11-the-docs-and-the-playground-render-titles-with-v-html) | docs    | medium   | to verify |

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

## Smaller things

- **Violation messages** reach `v-html`
  (`features/publish/Dialog/Violations.vue:53`). Drupal sends them as escaped
  markup. Another adapter's messages need the sanitiser (step 4), or have to
  become text as `getViolationText()` does (from X13, fixed otherwise).
- **An import's translations keep the reserved fields:**
  `createParagraphFromSerializedData()` strips `uuid`, `langcode`, `type` and
  the other fields a payload may not decide (`sanitizePayloadValues()`) only
  from the source language's values. A translation's values pass them to
  `addTranslation()`. Not XSS; found by reading, with X14, and what it does is
  unverified.
- `FormatTextFieldController`
  (`src/Controller/FormatTextFieldController.php:44`) processes text with any
  format the client names, without checking that the user may use it. Only the
  caller sees the result.
- **Search API's fulltext fields:** the Search API provider skips a value that
  isn't a scalar (`SearchApi::mapSearchItem()`). A field of the type "Fulltext"
  gives `TextValue` objects, so a result whose title is mapped to one is
  dropped. Not XSS; found by reading, with X8.
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
8. **The CSP:**
   - blökkli works under a strict CSP (no `'unsafe-eval'` for axe-core's
     locales, nonces for what it injects);
   - the sandbox gets one, from Nitro and from Drupal;
   - the directives the editor needs are documented.
9. **Docs:** X11, and what projects may rely on. That includes the iframes
   module: the project checks the source it frames itself (`<BlokkliIframe>`
   only passes it to the editor).
