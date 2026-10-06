# 11: Premium features

- **Status:** todo
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 09

## Goal

The agent works only in premium sandboxes. Normal sandboxes hide it rather than
failing, and they can't use it even through direct API calls.

## Tasks

- [ ] `paragraphs_blokkli`: add agent (and DeepL, depending on the open
      question) to `availableFeatures` in `pbConfig`. Each flag is true only
      when its secret or key is configured. This is an upstream change on
      drupal.org, and it also helps real projects without keys.
- [ ] Drupal adapter: map those flags in `getDisabledFeatures`
      (`src/modules/drupal/runtime/adapter/index.ts`).
- [ ] `settings.php`: inject the agent's `auth_secret` only for premium sandbox
      ids. Normal sandbox databases never contain it. The agent server rejects
      any token not signed with it
      (`src/modules/agent/runtime/server/agent.ts`).
- [ ] Give the Nuxt agent server a dedicated provider key with a spend limit set
      at the provider.
- [ ] Before the key: the agent's `/route` and `/fetch` endpoints check the auth
      token, as `/stream` does (F49). `/route` calls the routing model with the
      server's key for anyone today.
- [ ] Unique agent tokens (F51): all premium sandboxes share one secret, so two
      of them opening the agent in the same second get the same token, and the
      second is rejected.

## Acceptance criteria

- A normal sandbox doesn't show the agent, and a direct WebSocket attempt is
  rejected as unauthorized.
- A premium sandbox can use the agent.

## Notes

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- settings.php currently sets the agent's `auth_secret` from
  `NUXT_BLOKKLI_AGENT_AUTH_SECRET` for every site. The premium task above
  narrows that to premium sandbox ids.

From [chunk 09](09-control-plane.md) (2026-10-02):

- **settings.php can't see which sandboxes are premium.** Only the control app's
  database knows. A marker file in the sandbox's directory would do, written by
  `blokkli-sandbox:create --premium` when an invitation is claimed.

From [13i](13i-agent-and-modules.md) (2026-10-06):

- **The marker exists:** since 09b, `blokkli-sandbox:create` writes
  `sandboxes/<id>/lifetime.json`, and a premium claim's has no `idle`. Either
  `settings.php` reads that, or a `--premium` flag writes an explicit field.
- **All four test users** have `use paragraphs blokkli agent`. In a normal
  sandbox, only the missing secret keeps them from the agent: the token mutation
  throws. The `availableFeatures` flag (the first task) makes the frontend hide
  the agent instead.
