# 12: Hosted deploy

- **Status:** todo
- **Milestone:** M3 Hosted
- **Depends on:** 09, 10; 14b for the public launch

## Goal

The sandbox runs publicly on the existing Hetzner server using hosted ddev, in
two instances: `main` (public) at `sandbox.blokk.li` and `dev` (invite only) at
`dev-sandbox.blokk.li`. Sandboxes are subdomains of these, e.g.
`k3f9.sandbox.blokk.li`.

This chunk starts only once M0–M2 work locally.

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

## Acceptance criteria

- A stranger can go from blokk.li to editing in their own sandbox.
- Sandboxes expire on schedule.
- A redeploy works without manual steps.

## Notes

From [chunk 02](02-ddev-and-repo-layout.md) (2026-09-26):

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

From [chunk 03](03-drupal-base-site.md) (2026-09-26):

- **Required:** `IS_DDEV_HOSTED=true` in `.ddev/config.local.yaml`, and
  `DRUPAL_HASH_SALT` (plus the agent secret and keys) in `.ddev/.env.web`.
  settings.php refuses to run hosted without the salt; the local fallback is
  public.
- **`X-Forwarded-For`:** check that the hosted router also replaces what clients
  send (it does locally), and that `REMOTE_ADDR` is IPv4. `PRIVATE_SUBNETS`
  includes `::ffff:0:0/96`, so IPv4-mapped IPv6 addresses would all count as
  trusted proxies.

From [chunk 06](06-playground-drupal-app.md) (2026-09-26):

- **Check that the hosted instance serves the SPA only:**
  `playground-drupal/server/middleware/spa.ts` turns SSR off when
  `IS_DDEV_HOSTED=true`, which the Nuxt daemon must see in its environment.

From [13f](13f-translation.md) (2026-09-27):

- **A production build strips the texts' defaults:** a key that isn't loaded
  shows as the key. Anonymous visitors get no texts (chunk 10).
- **The generated `app/graphql/fragment.easyTexts.graphql` is committed:**
  nuxt-graphql-middleware reads the documents before nuxt-easy-texts writes it,
  so a fresh build uses the file on disk.

From [15a](15a-design-system.md) (2026-09-27):

- **The theme's nested CSS** (`main.css`) ships as native CSS nesting in dev;
  check that the production build flattens or keeps it as intended.

From [chunk 08](08-sandbox-routing.md) (2026-10-02):

- **The hosted domains:** `DDEV_HOSTNAME` needs the wildcard entries
  (`*.sandbox.blokk.li`), which settings.php reads, and nginx's
  `$blokkli_sandbox` map has only `blokkli.ddev.site` so far.
- **Disk:** a sandbox is a full copy (32 MB database, 11 MB files). Hard links
  would share the files, but Drupal can write into an existing file (see 08). On
  a filesystem with reflinks (XFS, btrfs), PHP's `copy()` should share the
  blocks on its own (it uses `copy_file_range`, which clones first). Check it on
  the server.
