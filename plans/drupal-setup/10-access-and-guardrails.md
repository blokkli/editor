# 10: Access and guardrails

- **Status:** todo
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 08

## Goal

A sandbox is safe to hand to anonymous strangers. It can't be abused as free
hosting, and it can't affect other sandboxes or the host.

## Tasks

- [ ] Anonymous users don't get `access content`.
  - [ ] A "preview on smartphone" session grant lets an anonymous session
        resolve the route and render page, media and files through GraphQL. This
        needs code (13e, F22): the grant adds no permissions today.
  - [ ] Without a grant, Nuxt shows the "this sandbox is private" page.
- [ ] Audit the editor role. It must not have any of: administer modules,
      permissions, users, text formats or site configuration. Nobody ever logs
      in as user 1.
- [ ] Text formats: only what blökkli's markup fields need.
- [ ] Uploads: images and documents only, a size limit, a per-sandbox quota.
- [ ] Mail is never sent. Capture it per sandbox and show it on an "Inbox" page,
      which also shows off notifications.
- [ ] Outgoing requests:
  - [ ] App level: the agent's `allowedFetchOrigins`.
  - [ ] Network level: an allowlist (oEmbed providers, LLM API, DeepL API),
        enforced in chunk 12.
- [ ] Host-only cookies, a CSP, and `X-Robots-Tag: noindex` everywhere. The
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
