# 10: Access and guardrails

- **Status:** todo
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 08

## Goal

A sandbox is safe to hand to anonymous strangers. It can't be abused as free
hosting, and it can't affect other sandboxes or the host.

## Tasks

- [ ] Anonymous users don't get `access content`.
  - [ ] Verify that a "preview on smartphone" session grant
        (`PreviewGrantChecker`) lets an anonymous session resolve the route and
        render page, media and files through GraphQL.
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
- [ ] Host-only cookies, a CSP, and `X-Robots-Tag: noindex` everywhere.

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
