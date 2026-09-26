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
