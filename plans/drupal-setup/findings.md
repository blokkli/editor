# Findings: upstream bugs

Bugs found while building the sandbox that belong in other projects, mostly
`paragraphs_blokkli`. They're tracked here and fixed separately. A fixed one is
removed; its commit names it. One that turns out to be a missing feature moves
to `plans/features/`, a file per feature.

Code references are relative to the `paragraphs_blokkli` repository at `32bbcfe`
(2.0.x), unless noted otherwise.

| #    | Finding                                                                                                            | Project                   | Severity | Status     |
| ---- | ------------------------------------------------------------------------------------------------------------------ | ------------------------- | -------- | ---------- |
| F120 | [A mutation from a text or form body runs as the user](#f120-a-mutation-from-a-text-or-form-body-runs-as-the-user) | `nuxt-graphql-middleware` | low      | workaround |

Statuses: `to verify` (read in the code, not reproduced), `open`, `workaround`
(the sandbox works around it).

## F120: A mutation from a text or form body runs as the user

- **Found:** 2026-10-24, with the XSS plan; reproduced in an E2E sandbox with
  `pbTakeOwnership` on a node that doesn't exist.
- **Symptom:** a POST to `/api/graphql_middleware/mutation/<name>` with a
  `text/plain` or form-encoded body and the user's session cookie runs the
  mutation as the user, whatever its `Origin`. `SameSite=Lax` only keeps other
  sites from sending the cookie; a page on another host of the same site can.
- **Cause:** the mutation handler of nuxt-graphql-middleware 5.4.0
  (`dist/runtime/server/api/mutation.js`) reads the body with h3's `readBody()`,
  which takes any content type, and checks neither the type nor the origin.
  Drupal's own endpoint refuses such requests (`QueryRouteEnhancer` in
  drupal/graphql).
- **Workaround:** the sandbox's nginx answers 415 to a mutation that isn't
  `application/json` (`$blokkli_mutation_refused` in
  `.ddev/nginx_full/nginx-site.conf`).
- **Impact:** low here: none of the sandbox's hosts could send one, and nginx
  refuses it now. Higher for a site that shares its domain with hosts that serve
  other people's content.
- **Fix idea:** refuse a mutation whose content type isn't `application/json`,
  with a 415. A JSON POST from another origin needs a CORS preflight.
