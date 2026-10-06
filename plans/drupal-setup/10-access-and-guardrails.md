# 10: Access and guardrails

- **Status:** done
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 08

## Goal

A sandbox is safe to hand to anonymous strangers. It can't be abused as free
hosting, and it can't affect other sandboxes or the host.

## Tasks

- [x] Anonymous users don't get `access content`.
  - [x] A "preview on smartphone" session grant lets an anonymous session
        resolve the route and render page, media and files through GraphQL. This
        needs code (13e, F22): the grant adds no permissions today.
  - [x] Without a grant, Nuxt shows the "this sandbox is private" page.
  - [x] With a grant, anonymous visitors also need
        `view paragraph content <type>` for every paragraph type, since
        `paragraphs_type_permissions` is on (13h). They get
        `bypass paragraphs type content access`, which also hides unpublished
        paragraphs.
- [x] Audit the editor role. It must not have any of: administer modules,
      permissions, users, text formats or site configuration. Nobody ever logs
      in as user 1. 13h's four roles have none of them.
- [x] Text formats: only what blökkli's markup fields need.
- [x] Uploads: images and documents only, a size limit, a per-sandbox quota.
- [x] Mail is never sent. ~~Capture it per sandbox and show it on an "Inbox"
      page, which also shows off notifications.~~ No Inbox for now (the user,
      2026-10-06).
- [x] Outgoing requests:
  - [x] App level: the agent's `allowedFetchOrigins`. Stays unset.
  - [x] Network level: an allowlist (oEmbed providers, LLM API, DeepL API),
        enforced in chunk 12. The list is in 12's tasks.
- [x] Host-only cookies, a CSP, and `X-Robots-Tag: noindex` everywhere. The
      embed paragraph type (13i) frames only the site's own pages
      (`frame-src 'self'`).

## Acceptance criteria

- Every item above has been checked by hand against a local sandbox, with
  results under Notes.

## Notes

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- Anonymous `access content` is already revoked in the config.
- **GraphQL:** the server has `debug_flag: 1` and no limits on query depth or
  complexity (as in the starterkit). Decide both for sandboxes, together with
  anonymous GraphQL access (chunk 06).

From [chunk 06](06-playground-drupal-app.md) (2026-09-26):

- **GraphQL access today:**
  - `authenticated` has `execute graphql arbitrary graphql requests`, and
    `anonymous` has no GraphQL permission, so anonymous users get the private
    page.
  - The server still has `debug_flag: 1` and no depth or complexity limits.
- **SSR for anonymous users** runs locally only, and today it only renders the
  private page. To exercise blökkli's server code paths, anonymous users need
  content access on the local site. That must be a local-only override (e.g. in
  `settings.local.php`), never `config/sync`, or every sandbox would be public.

From [13e](13e-publishing.md) (2026-09-27):

- **A grant adds no permissions** (F22). The grant route and `last_changed` need
  `access content`, GraphQL needs its permission, and the host needs view
  access. `PreviewGrantChecker::isEntityPreviewable()` has no callers.
- **What anonymous previews need:** a route access check that accepts a valid
  grant (for `preview_grant` and `last_changed`), and an access policy that adds
  view and GraphQL permissions while the session holds a grant. Possibly in
  `blokkli_playground`, better upstream.
- **Tested so far:** a plain logged-in user in another session sees the pending
  changes through the link.

From [13f](13f-translation.md) (2026-09-27):

- **Anonymous visitors get no UI texts:** the texts query needs GraphQL access
  (403 today). `nuxi dev` shows the defaults, a production build the keys, on
  the error pages too. The "This sandbox is private" page is plain English on
  purpose.
- **Any GraphQL user can create text keys:** the texts resolvers create a text
  for every unknown key, without an access check. Sandbox users are logged in,
  so they could fill the table.

From [15a](15a-design-system.md) (2026-09-27):

- **`/<lang>/design-system` is public:** the design system and its mockups use
  no GraphQL, so anonymous visitors see them (with English UI strings). Decide
  whether the hosted sandbox shows them or answers 404.

From [chunk 08](08-sandbox-routing.md) (2026-10-02):

- **The default site's session cookie reaches every sandbox.** Drupal sets it
  for `.<host>`, e.g. `.blokkli.ddev.site`, so the browser also sends it to
  `a1.blokkli.ddev.site`. It logs no one in there (a sandbox's cookie has
  another name), but hosted it's the control plane's, and
  `server/middleware/ spa.ts` takes any `SESS` cookie for a login. Part of
  "Host-only cookies".
- **Public files are readable across sandboxes:** nginx serves any existing file
  under `sites/default/files/`, whatever the host, so a sandbox's files are
  public to anyone who knows the path (the ids are random). Private files go
  through Drupal.

From [chunk 09](09-control-plane.md) (2026-10-02):

- **Turnstile:** the claim page loads its script from
  `challenges.cloudflare.com`, and the control app verifies the answer there.
  Both belong on the outgoing allowlist.
- **The default site's cookie, hosted:** there, the default site is only the
  bake target, and nobody logs in to it. So the cookie problem above exists only
  locally.

## Done (2026-10-06)

### Decisions

- **The user:**
  - **Disclosure:** the upload fix (F47) lands in 2.0.x, and the notes only say
    that upload file names are validated. Whether to report 1.x to the security
    team is the user's call.
  - **No Inbox:** nothing sends mail but Drupal's account mails (blökkli's
    notifications are in-app), and ddev's Mailpit catches them without ever
    relaying. Chunk 12's firewall hides Mailpit.
  - **Local SSR:** `$settings['blokkli_playground_public'] = TRUE;` in
    `settings.local.php` makes the dev site viewable for anonymous visitors.
    Sandboxes ignore it (settings.php). See CONTRIBUTING.md.
  - **Files stay public, with limits:**
    - only images and documents;
    - 10 MB per image or document, 2 MB per user picture;
    - 100 MB per sandbox;
    - noindex;
    - only on their own sandbox's host.
- **Proposed in the plan:**
  - **GraphQL:** `debug_flag` is off on sandboxes and stays on for the dev site.
    No depth or complexity limits: blökkli's queries are deep.
  - **`allowedFetchOrigins`** stays unset: no web fetch. The agent's endpoints
    lack authentication (F49), which chunk 11 fixes before the agent gets an API
    key.
  - **`/<lang>/design-system`** stays public: it has no content.

### What changed

- **`paragraphs_blokkli`** (`81ced3a`..`c4be24b`, 2.0.x): F22 fixed upstream,
  F47 and F8 through core's upload handler, the schema of `media_bundle_file`
  (F7).
- **Anonymous visitors** (`blokkli_playground`):
  - `AnonymousViewerAccessPolicy` gives anonymous sessions with a valid grant
    `access content`, GraphQL and `bypass paragraphs type content access`.
  - `PreviewHooks` lets the grant view an unpublished host.
  - The anonymous role keeps only `view media`.
- **Text formats:** `basic_html` (text, steps), `table`, `plain_text` (the
  fallback) and `blokkli_comment` (set in code).
  - `full_html` and `restricted_html` are gone.
  - `basic_html` has no images: no toolbar button, no upload to `inline-images`
    (which had no limit), no `<img>`.
- **Uploads:**
  - `blokkli_sandbox`'s `UploadQuotaSubscriber` refuses a new file that would
    take the files of the sandbox's users over 100 MB. The template's files have
    no owner or belong to user 1, and don't count.
  - It runs for every upload core validates: Drupal's forms, and since F47
    blökkli's paste and drop.
- **Cookies:** `BlokkliSandboxServiceProvider` sets `cookie_domain` to `''`:
  host-only session cookies, with the same name on every host. Every session
  ended once.
- **nginx:**
  - `headers.inc`: the CSP (`$blokkli_csp`) and
    `X-Robots-Tag: noindex, nofollow`, on the public servers and the
    unknown-sandbox page.
  - A sandbox's files are only served on its own host, and the default site
    serves none of them.
  - No PHP under `sites/*/files`.
  - `ddev check-routes` checks both file rules.

### Checked

- **Module:**
  - `ddev phpunit-parallel`: 74 classes, the new `FileUploadMutationTest` and
    `CanUseBlokkliTest` included.
  - The new tests fail on the old code: the token and the extension, the route's
    access and the language.
  - `ddev phpcs` is clean; `ddev phpstan` shows only the 115 known errors.
- **Site:**
  - `bun run verify` passes.
  - Baked EN and DE, recreated a1 and b2, `ddev check-routes` all ok.
- **Over HTTP, anonymous on a1**, for a published page and an unpublished news
  item:
  - **Without a grant:** GraphQL and `last_changed` 403, the page is the private
    page.
  - **The DE link:** 302 to the German page with `?blokkliPreview=`. The session
    cookie has no `Domain`.
  - **With the grant:**
    - the route resolves;
    - the edit state has the change;
    - the image derivative has a URL;
    - `last_changed` answers;
    - an `add` mutation is refused.
  - **After publishing,** the same session gets 403 again.
- **Headers:** the CSP and X-Robots-Tag on a Nuxt page, a Drupal page, the
  unknown-sandbox page and the control app.
  - Nitro's error responses (the private page) add their own, stricter CSP. Both
    apply, which does no harm.
- **Files:**
  - a1's image: 200 on a1, 404 on the dev site;
  - b2's image: 404 on a1, 200 on b2;
  - a text file named `.php` in a1's files: 403.
- **Uploads, as Anna on a1:**
  - `notes.html` is refused with core's message;
  - `notes.txt` lands in `media/documents`;
  - a1's `tmp` stays empty.
- **The quota, on a1:**
  - a new file of 101 MB gets the violation;
  - 1 KB passes;
  - a stored file isn't counted again;
  - the dev site has no quota.
- **GraphQL:** `debug_flag` is 0 on a1 and 1 on the dev site.
- **Local SSR:** with the flag, the dev site's `/de` renders the home page on
  the server (200, with its title), while a1 stays private (403).
- **Role audit:** no role has administer modules, permissions, users, filters or
  site configuration, `bypass node access`, config import or export, masquerade
  or `use text format full_html`. `administrator` (`is_admin`) has no user. User
  1's password is random per bake and its mails go to Mailpit.

### Still to check (the user, in the browser)

- **No CSP violations in the console:**
  - the editor and its forms;
  - the preview iframe;
  - CKEditor in the text form;
  - the media library, and a remote video's preview there (YouTube or Vimeo in
    `frame-src`?);
  - the QR code;
  - a chart export.
- **The preview:** "Preview (with smartphone)" opened in a private window shows
  the pending change.
- **The claim page,** with Turnstile.

### Known gaps

- **The CSP blocks two rare images:**
  - the clipboard's `http://i3.ytimg.com` thumbnail (mixed content anyway);
  - tiptap's GitHub emoji fallback images.
- **`'unsafe-inline'`:** the CSP limits loading and framing, not XSS.
- **Preview grants:**
  - grant holders pass `canUseBlokkli` (F48);
  - any GraphQL user creates text keys (F50).
- **The claimed sandboxes `1ts2n4svvh` and `q0it15q9mc`** were gone before this
  chunk's checks (expired), so only a1 and b2 were recreated.
