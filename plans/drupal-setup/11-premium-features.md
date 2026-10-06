# 11: Premium features

- **Status:** done (2026-10-06)
- **Milestone:** M2 Sandboxes (local)
- **Depends on:** 09

## Goal

The agent works only in premium sandboxes. Normal sandboxes hide it rather than
failing, and they can't use it even through direct API calls.

## Tasks

- [x] `paragraphs_blokkli`: add agent (and DeepL, depending on the open
      question) to `availableFeatures` in `pbConfig`. Each flag is true only
      when its secret or key is configured. This is an upstream change on
      drupal.org, and it also helps real projects without keys. Decided: the
      agent only; DeepL stays in every sandbox (the user, 2026-10-06).
- [x] Drupal adapter: map those flags in `getDisabledFeatures`
      (`src/modules/drupal/runtime/adapter/index.ts`).
- [x] `settings.php`: inject the agent's `auth_secret` only for premium sandbox
      ids. Normal sandbox databases never contain it. The agent server rejects
      any token not signed with it
      (`src/modules/agent/runtime/server/agent.ts`).
- [x] Moved to 12: a dedicated provider key for the Nuxt agent server, with a
      spend limit set at the provider. It's for the hosted site.
- [x] Before the key: the agent's `/route` and `/fetch` endpoints check the auth
      token, as `/stream` does (F49). `/route` calls the routing model with the
      server's key for anyone today.
- [x] Unique agent tokens (F51): all premium sandboxes share one secret, so two
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

## As built (2026-10-06)

Decided (the user): DeepL stays in every sandbox; only the agent is premium.

- **Premium sandboxes:**
  - `blokkli-sandbox:create --premium` writes `"premium": true` into
    `lifetime.json` (`SandboxManager::create()`).
  - The control app passes it for invitation claims
    (`server/api/claim.post.ts`).
  - `settings.php` gives the agent's secret to the dev site and to sandboxes
    whose `lifetime.json` says premium. The others have an empty secret: Drupal
    makes no tokens there.
  - Proposed by Claude: an explicit flag rather than reading "premium" from a
    missing `idle`.
- **`paragraphs_blokkli`** (the user commits it; the flag is `7faae6f`):
  - `paragraphsBlokkliAvailableFeatures.agent`: the agent module is enabled and
    has a secret. Its cache depends on the agent's settings. New kernel test:
    `modules/paragraphs_blokkli_graphql/tests/src/Kernel/AvailableFeaturesDataProducerTest.php`.
  - The token gets a nonce (F51). The agent module's README says that an empty
    secret hides the agent.
- **The Drupal adapter** disables the `agent` feature when the flag is false.
  `pbConfig` asks for the field, so the frontend needs a `paragraphs_blokkli`
  with it.
- **The agent server:** `/route` and `/fetch` check the token (F49). The client
  sends a fresh one, and `/fetch` follows only allowed redirects. With
  `enableMock`, only conversations with a script skip the routing model: before,
  the sandbox had no routing at all.

Verification:

- **Gates:** `verify` passes all 11 gates. In the module: `phpcs` is clean, and
  `phpstan` reports the known 115 errors, none in the changed files.
  `phpunit-parallel` passes, and the new test passes on its own.
- **The flags and tokens, as Anna** (`tmp/11-premium.sh`):
  - **The dev site and p1** (`--premium`): `agent: true`, and a token
    `<timestamp>:<nonce>:<hmac>`.
  - **n1** (normal): `agent: false`, and the token mutation fails.
- **`/route`:**
  - Without a token, or with a made-up one: 401.
  - With p1's token: the routing model (Haiku) picks `blockingen-style-guide`
    for "Write the page in plain language."
  - With a mock script: its routing, without the model.
- **`/fetch`:**
  - Without a token: 401.
  - With one: 403, no allowed origins (it threw before).
  - Redirects aren't tested: there are no allowed origins locally.
- **The WebSocket:** two tokens of p1 made in a row differ, and both
  authenticate: the mock replays its tool call, and the model answers.
- **An invitation claim** through the control app writes
  `{"expires":…, "idle":null, "premium":true}`.
- **Not run:** the E2E suite. Its agent specs call `/route` through the
  playground's token route, which uses the new format.
- **The user, in the browser:** it works: n1 shows no agent; p1 and the dev
  site do.
