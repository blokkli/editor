# 12: Hosted deploy

- **Status:** todo
- **Milestone:** M3 Hosted

## Goal

The sandbox runs publicly on the existing Hetzner server using hosted ddev, in
two instances: `main` (public) at `sandbox.blokk.li` and `dev` (invite only) at
`dev-sandbox.blokk.li`. Sandboxes are subdomains of these, e.g.
`k3f9.sandbox.blokk.li`.

## Tasks

- [ ] Isolate the sandbox on the Hetzner server. If other things run there, give
      the sandbox its own VM. The firewall allows only 80, 443 and SSH. Two
      reasons: ddev's router also publishes dev tools such as Mailpit on
      8025/8026, and the web container gives its user passwordless sudo.
- [ ] ddev in hosted mode:
  - [ ] the starterkit's `nginx-site-hosted.conf.template`, selected by
        `IS_DDEV_HOSTED=true` in `.ddev/config.local.yaml`
  - [ ] Nuxt runs as a production build daemon (`node .output/server/index.mjs`)
        instead of `nuxi dev`
  - [ ] the agent's `enableMock` off in that build
        (`sandbox/frontend/nuxt.config.ts`): with it, any client can skip the
        API key and have the server run tool calls of its choosing (13i)
  - [ ] a dedicated provider key for the agent, with a spend limit set at the
        provider (moved from 11)
- [ ] TLS with a wildcard certificate via the DNS-01 challenge:
  - ddev's built-in Let's Encrypt uses TLS-ALPN-01 (the router's static config
    has `acme-tlsChallenge`), which can't issue wildcards. A certificate per
    subdomain would hit Let's Encrypt's limit of 50 certificates per registered
    domain per week.
  - Two certificates: `*.sandbox.blokk.li` and `*.dev-sandbox.blokk.li`.
  - Options: a Traefik DNS resolver for Netlify DNS (lego provider `netlify`;
    verify), or move or delegate the zones to another DNS provider.
- [ ] Two ddev projects: `main` → `sandbox.blokk.li`, `dev` →
      `dev-sandbox.blokk.li`.
- [ ] Re-bake regularly (e.g. weekly), not only on deploy, so that the seeded
      dates stay current (14a: they're relative to the bake).
- [ ] Deploy script: check out the branch → `git submodule update` → composer
      install → bun install → build Nuxt → bake → expire all sandboxes →
      restart. Run it manually at first; a GitHub Action can come later.
- [ ] Entry point: a "Try blökkli" link on blokk.li that goes to the claim page
      on the apex.
- [ ] Monitoring: disk usage from sandboxes, error logs, and an alert when the
      active-sandbox cap gets close.
- [ ] Outgoing requests only to an allowlist (chunk 10):
  - `api.anthropic.com` (the agent)
  - `api.deepl.com` and `api-free.deepl.com`
  - `challenges.cloudflare.com` (Turnstile's verification)
  - `oembed.com` (the providers list), and YouTube's and Vimeo's oEmbed
    endpoints and thumbnail hosts (remote videos)
  - `ftp.drupal.org`, only if the deploy imports interface translations
  - no SMTP: mail stays in Mailpit
- [ ] The hosted nginx template takes chunk 10's rules from `nginx-site.conf`:
      `headers.inc` (CSP, noindex), each sandbox's files only on its host, and
      no PHP under `sites/*/files`.
- [ ] Candidates: limits on PHP-FPM time (600 s today), request size (100M) and
      request rate, so that one sandbox can't slow down the others.

## Acceptance criteria

- A stranger can go from blokk.li to editing in their own sandbox.
- Sandboxes expire on schedule.
- A redeploy works without manual steps.

## Notes

From chunk 02 (2026-09-26):

- **Never run `nuxi dev` on a hosted instance.** Vite's `/@fs/` serves any file
  in the repo (databases, `.env`). Hosted runs the production build only.
- **The daemon:** `.ddev/nuxt-daemon.sh` can branch on `IS_DDEV_HOSTED` and run
  `node .output/server/index.mjs` instead, so `web_extra_daemons` stays the same
  in both setups.
- **nginx:** when the hosted variant arrives, move the shared parts (the Drupal
  path list, the internal Drupal server) into include files not named `*.conf`.
  ddev copies all of `nginx_full/` into `sites-enabled/`, but nginx only loads
  `*.conf` from there, so the includes are only read where they're included.
- **Forwarded headers:** nginx trusts `X-Forwarded-Host`, because the ddev
  router overwrites what clients send (tested locally). Check that the hosted
  router does the same, or a client could pick another sandbox's host.
- **The `post-start` hook runs `composer install` on every restart.** Harmless,
  but the deploy script runs it anyway.

From chunk 03 (2026-09-26):

- **Required:** `IS_DDEV_HOSTED=true` in `.ddev/config.local.yaml`, and
  `DRUPAL_HASH_SALT` (plus the agent secret and keys) in `.ddev/.env.web`.
  settings.php refuses to run hosted without the salt; the local fallback is
  public.
- **`X-Forwarded-For`:** check that the hosted router also replaces what clients
  send (it does locally), and that `REMOTE_ADDR` is IPv4. `PRIVATE_SUBNETS`
  includes `::ffff:0:0/96`, so IPv4-mapped IPv6 addresses would all count as
  trusted proxies.

From chunk 06 (2026-09-26):

- **Check that the hosted instance serves the SPA only:**
  `sandbox/frontend/server/middleware/spa.ts` turns SSR off when
  `IS_DDEV_HOSTED=true`, which the Nuxt daemon must see in its environment.

From 13f (2026-09-27):

- **A production build strips the texts' defaults:** a key that isn't loaded
  shows as the key. Anonymous visitors get no texts (chunk 10).
- **The generated `app/graphql/fragment.easyTexts.graphql` is committed:**
  nuxt-graphql-middleware reads the documents before nuxt-easy-texts writes it,
  so a fresh build uses the file on disk.

From 15a (2026-09-27):

- **The theme's nested CSS** (`main.css`) ships as native CSS nesting in dev;
  check that the production build flattens or keeps it as intended.

From chunk 08 (2026-10-02):

- **The hosted domains:** `DDEV_HOSTNAME` needs the wildcard entries
  (`*.sandbox.blokk.li`), which settings.php reads, and nginx's
  `$blokkli_sandbox` map has only `blokkli.ddev.site` so far.
- **Disk:** a sandbox is a full copy (32 MB database, 11 MB files). Hard links
  would share the files, but Drupal can write into an existing file (see 08). On
  a filesystem with reflinks (XFS, btrfs), PHP's `copy()` should share the
  blocks on its own (it uses `copy_file_range`, which clones first). Check it on
  the server.

From chunk 09 (2026-10-02):

- **The control app** (`sandbox/control/`):
  - It needs its own production build and daemon, with the same `IS_DDEV_HOSTED`
    branch as the frontend's.
  - nginx's control server gets the apex as `server_name`, and
    `$blokkli_control_url` the apex's URL.
- **Required settings:**
  - `NUXT_SANDBOX_LOGIN_SECRET`: settings.php refuses to run without it.
  - `NUXT_ADMIN_PASSWORD`: without it, `/admin` answers 503.
  - the Turnstile keys
- **`sandbox/control/.data/`** holds the sandboxes and the invitations. It must
  survive deploys.
- **The deploy deletes all sandboxes.** The cleanup then marks their rows as
  deleted.
- **Nitro's dev server runs tasks at `/_nitro/tasks/<name>`,** for anyone. It's
  one more reason never to run `nuxi dev` hosted.
