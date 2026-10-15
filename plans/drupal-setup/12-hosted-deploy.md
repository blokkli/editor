# 12: Hosted deploy

- **Status:** in progress: the repository is ready (2026-10-14), the server
  isn't set up
- **Milestone:** M3 Hosted

## Goal

First an internal instance, run by a colleague, not public. Later the sandbox
runs publicly on the existing Hetzner server using hosted ddev, in two
instances: `main` (public) and `dev` (invite only).

**The hosts** (decided 2026-10-14): ddev's `project_tld` is the hosted domain,
so the hosts have the local shape under it: `blokkli-control.<domain>` (the
claim page), `<id>.blokkli.<domain>` (sandboxes), `blokkli.<domain>` (leads to
the claim page). nginx, settings.php and the control app then need no domain of
their own. The earlier idea, the claim page on the apex and sandboxes directly
under it (`k3f9.sandbox.blokk.li`), would need a hosted nginx config of its own.

**The internal instance** is at `dev-sandbox.blokk.li` (its `project_tld`;
decided 2026-10-14), the name this plan had for the invite-only instance:
`blokkli-control.dev-sandbox.blokk.li` (the claim page),
`<id>.blokkli.dev-sandbox.blokk.li` and `blokkli.dev-sandbox.blokk.li`. The DNS
records exist (Netlify, zone `blokk.li`, 2026-10-14): A and AAAA for
`blokkli.dev-sandbox`, `blokkli-control.dev-sandbox` and
`*.blokkli.dev-sandbox`. `sandbox.blokk.li` stays free for the public instance.

How the hosted instance works: the `sandbox` skill, "Hosting", and
`CONTRIBUTING.md`, "Hosting". The steps on the server, and what's there:
`12a-server-setup.md`.

## Tasks

- [ ] Isolate the sandbox on the Hetzner server. The internal instance shares
      `starterkit.blokk.li` with other ddev projects, and that host has no
      firewall of its own (12a). If other things run there, give the sandbox its
      own VM. The firewall allows only 80, 443 and SSH. Two reasons: ddev's
      router also publishes dev tools such as Mailpit on 8025/8026, and the web
      container gives its user passwordless sudo.
- [ ] ddev in hosted mode:
  - [x] one nginx config for both: the domain comes from `project_tld`, and
        nginx tells hosted from local by it (2026-10-14)
  - [x] both Nuxt apps run their production builds when hosted
        (`.ddev/nuxt-daemon.sh`, `bun run sandbox:build`)
  - [x] the agent's `enableMock` is off in a production build
        (`sandbox/frontend/nuxt.config.ts`): with it, any client can skip the
        API key and have the server run tool calls of its choosing (13i)
  - [ ] `.ddev/config.local.yaml` on the server: `IS_DDEV_HOSTED=true` and
        `project_tld: dev-sandbox.blokk.li`
  - [ ] a dedicated provider key for the agent, with a spend limit set at the
        provider (moved from 11)
- [ ] TLS with wildcard certificates via the DNS-01 challenge:
  - With `use_letsencrypt`, ddev writes `Host()` rules and breaks the wildcard
    hostname (seen on the server, 2026-10-15). 12a: lego, the certificate as a
    file in the router's config, and our own router config.
  - ddev's built-in Let's Encrypt uses TLS-ALPN-01 (the router's static config
    has `acme-tlsChallenge`), which can't issue wildcards. A certificate per
    subdomain would hit Let's Encrypt's limit of 50 certificates per registered
    domain per week.
  - Per instance, one certificate: `blokkli.<domain>`,
    `blokkli-control.<domain>` and `*.blokkli.<domain>`.
  - Options: a Traefik DNS resolver for the domain's DNS provider (for Netlify
    DNS, lego's provider `netlify`; verify), or move or delegate the zone.
    Netlify's API token can change every record of the account: safer is a CNAME
    from each `_acme-challenge.<name>` to a challenge-only service (e.g.
    acme-dns), whose credentials are all the server holds.
- [ ] IPv6: the AAAA records exist. Check that the router sees an IPv6 visitor's
      address (`X-Forwarded-For`): Docker's userland proxy replaces it by
      default, and every IPv6 visitor would then share one address, and the
      claim page's limit of 3 claims per address and hour. If it does, remove
      the AAAA records or change Docker's setup.
- [ ] Public, later: two ddev projects, `main` and `dev`, each with its own
      domain.
- [ ] Re-bake regularly (e.g. weekly), not only on deploy, so that the seeded
      dates stay current (14a: they're relative to the bake): a cron job on the
      server that runs `ddev deploy`.
- [x] Deploy script: `ddev deploy` (`.ddev/commands/host/deploy`, 2026-10-14). A
      push to `dev` runs it (`.github/workflows/deploy-sandbox.yml`, 12a). Not
      run on a server yet: only its guards are tried.
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
- [x] Chunk 10's rules hold when hosted: there's one nginx config. Hosted, it
      also redirects the default site to the claim page, and has no exception
      for Drupal's GraphQL endpoint (2026-10-14).
- [ ] On the server: check that the ddev router passes on no `ddev.site` host
      and overwrites `X-Forwarded-Host` (nginx relies on both), and that
      `DDEV_HOSTNAME` has only the hosted names (`ddev deploy` checks it).
- [ ] Candidates: limits on PHP-FPM time (600 s today), request size (100M) and
      request rate, so that one sandbox can't slow down the others.

## Acceptance criteria

- A stranger can go from blokk.li to editing in their own sandbox.
- Sandboxes expire on schedule.
- A redeploy works without manual steps.

## Notes

From chunk 02 (2026-09-26):

- **Never run `nuxi dev` on a hosted instance.** Vite's `/@fs/` serves any file
  in the repo (databases, `.env`). Hosted runs the production build only
  (`.ddev/nuxt-daemon.sh` branches on `IS_DDEV_HOSTED`).
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
- **The production builds** were tried locally on 2026-10-14, on spare ports:
  they build in about 20 s; pages, assets, the editor's GraphQL operations and a
  claim work; `/@fs/` and `/_nitro/tasks` get the app's page. Not tried in a
  browser.

From chunk 08 (2026-10-02):

- **The hosted domains:** with `project_tld`, `DDEV_HOSTNAME` has the wildcard
  entry (`*.blokkli.<domain>`) that settings.php and the control app read.
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
