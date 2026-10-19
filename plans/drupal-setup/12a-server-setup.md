# 12a: Server setup (internal instance)

- **Status:** written 2026-10-15, not run yet
- **Part of:** 12 Hosted deploy

The steps for the internal instance at `dev-sandbox.blokk.li` on
`liip@starterkit.blokk.li`. Nothing on the server has been changed yet; the
findings below come from looking at it.

## The server (2026-10-15)

- **Shared:** Debian 12, ddev 1.25.4, Docker 29.9, Traefik 3.7, 4 CPUs, 7.8 GB
  RAM, 63 GB free. ddev projects `starterkit` and `winterthur` run, `zooh` and
  `gemeindeportal` are stopped; all share one router. 12 wants a VM of its own:
  fine for the internal instance, not for the public one.
- **Users:** `liip` runs ddev and owns the checkout (`~/sandbox`) and `~/lego`;
  it has no sudo. `manager` has passwordless sudo: for what needs root
  (firewall, `/etc/docker/daemon.json`, files a container left to root). Never
  run ddev as `manager`: ddev's global config and the projects are `liip`'s.
- **No host firewall** (ufw inactive; iptables INPUT and ip6tables INPUT are
  ACCEPT without rules, only Docker's chains; no `/etc/docker/daemon.json`). The
  router binds all interfaces and publishes 8025/8026 (Mailpit), 9200/9201,
  8108–8111, 8142/8143 and 9998/9999. Check the Exoscale security group: only
  22, 80, 443.
- **ddev's router config breaks the wildcard with Let's Encrypt on.** With
  `use_letsencrypt: true` (global, for the other projects), ddev writes `Host()`
  rules instead of `HostRegexp()`, so that Traefik can derive the domains; the
  wildcard becomes ``Host(`[a-zA-Z0-9-]+.blokkli.…`)``, which Traefik rejects
  ("invalid value for HostSNI matcher"), and sandbox hosts get the router's 404.
  Hence our own `.ddev/traefik/config/blokkli.yaml` (step 4b) and our own
  wildcard certificate (step 4).
- **IPv6:** Docker runs with `EnableUserlandProxy: true`, so IPv6 visitors
  likely all arrive with one address (12, "IPv6"). Until checked, remove the
  AAAA records.
- **ext4, no reflinks:** every sandbox is a full copy.
- **ddev reads only `config.*.yaml`:** `starterkit`'s `config.local.yml` is
  ignored.
- **Additional files in `.ddev/traefik/config/` are merged** into the router's
  config (`starterkit`'s `fonts.yaml` is in `starterkit_merged.yaml`).
- **The crontab** runs `docker system prune -a -f` on Saturdays: harmless, but
  the next start pulls the images again.

## Steps

### 1. Checkout

The repository is public: the server clones it over HTTPS, without a key.
`ddev deploy` pulls the same way. The submodule comes from drupal.org over HTTPS
too.

```bash
git clone --recurse-submodules -b dev https://github.com/blokkli/editor.git ~/sandbox
```

### 2. The domain: `.ddev/config.local.yaml`

In the project's `.ddev/` (`~/sandbox/.ddev/`), not in ddev's global `~/.ddev/`,
which ignores it.

```yaml
project_tld: dev-sandbox.blokk.li
web_environment:
  - IS_DDEV_HOSTED=true
```

- No `override_config: true` (the other projects have it): the
  `additional_hostnames` and `DRUSH_OPTIONS_URI` come from `config.yaml`.
- No `additional_fqdns`: the `ddev.site` names would stay, and `sandboxUrl()`
  would pick their wildcard.

The hosts are then `blokkli.dev-sandbox.blokk.li`,
`blokkli-control.dev-sandbox.blokk.li` and `<id>.blokkli.dev-sandbox.blokk.li`,
the ones with DNS records.

### 3. Secrets: `.ddev/.env.web`

```bash
cd ~/sandbox
ddev dotenv set .ddev/.env.web \
  --drupal-hash-salt="$(openssl rand -hex 32)" \
  --nuxt-sandbox-login-secret="$(openssl rand -hex 32)" \
  --nuxt-admin-password="<password for /admin>" \
  --nuxt-blokkli-agent-auth-secret="$(openssl rand -hex 32)"
```

Optional: `--nuxt-blokkli-agent-api-key` (a key of its own, with a spend limit),
`--deepl-auth-key`, the Turnstile keys.

### 4. TLS: a wildcard certificate via DNS-01

lego with Netlify's DNS. A Netlify token can change every record of the account;
the safer way is a CNAME from `_acme-challenge.<name>` to acme-dns
(`--dns acme-dns`, see 12).

```bash
mkdir -p ~/lego && chmod 700 ~/lego
install -m 600 /dev/null ~/lego/netlify.token   # then paste the token into it
docker run --rm --user "$(id -u):$(id -g)" -v ~/lego:/data \
  -e NETLIFY_TOKEN="$(cat ~/lego/netlify.token)" goacme/lego:v4.19.2 \
  --path /data --accept-tos --email jonathan.minder+letsencrypt@liip.ch --dns netlify \
  -d blokkli.dev-sandbox.blokk.li -d '*.blokkli.dev-sandbox.blokk.li' -d blokkli-control.dev-sandbox.blokk.li \
  run

# ddev creates .ddev/traefik/ only on the first start
mkdir -p ~/sandbox/.ddev/traefik/certs ~/sandbox/.ddev/traefik/config
cp ~/lego/certificates/blokkli.dev-sandbox.blokk.li.crt ~/sandbox/.ddev/traefik/certs/blokkli-wildcard.crt
cp ~/lego/certificates/blokkli.dev-sandbox.blokk.li.key ~/sandbox/.ddev/traefik/certs/blokkli-wildcard.key

cat > ~/sandbox/.ddev/traefik/config/blokkli-tls.yaml <<'EOF'
tls:
  certificates:
    - certFile: /mnt/ddev-global-cache/traefik/certs/blokkli-wildcard.crt
      keyFile: /mnt/ddev-global-cache/traefik/certs/blokkli-wildcard.key
EOF
printf '.ddev/traefik/config/blokkli-tls.yaml\n.ddev/traefik/certs/blokkli-wildcard.*\n' >> ~/sandbox/.git/info/exclude
```

ddev copies every file in `.ddev/traefik/certs/` into the router, and merges
`blokkli-tls.yaml` into its config (checked 2026-10-15): Traefik serves the
certificate for every host, sandboxes included.

`~/lego` stays outside the checkout, which the web container mounts. Without
`--user`, the files belong to root (fix as `manager`:
`sudo chown -R liip:liip /home/liip/lego`).

Renewal: the same command with `renew --days 30` instead of `run`, then copy and
`ddev restart`; best right before the weekly deploy.

### 4b. The router's config: `.ddev/traefik/config/blokkli.yaml`

After the first `ddev start`, replace ddev's file (gitignored) with this one.
Without the `#ddev-generated` line ddev leaves it alone; update it by hand when
the hostnames in `config.yaml` change. HTTP redirects to HTTPS.

```yaml
#ddev-silent-no-warn
# Maintained by hand on the hosted instance (no ddev-generated line): with
# use_letsencrypt, ddev writes Host() rules, which break the wildcard
# hostname. TLS comes from blokkli-tls.yaml (the wildcard certificate).
# Update this file when the hostnames in config.yaml change.

http:
  routers:
    blokkli-web-80-http:
      entrypoints:
        - http-80
      rule:
        HostRegexp(`^blokkli\.dev-sandbox\.blokk\.li$`) ||
        HostRegexp(`^[a-z0-9-]+\.blokkli\.dev-sandbox\.blokk\.li$`) ||
        HostRegexp(`^blokkli-control\.dev-sandbox\.blokk\.li$`)
      service: 'blokkli-web-80'
      tls: false
      middlewares:
        - 'blokkli-redirectHttps'

    blokkli-web-80-https:
      entrypoints:
        - http-443
      rule:
        HostRegexp(`^blokkli\.dev-sandbox\.blokk\.li$`) ||
        HostRegexp(`^[a-z0-9-]+\.blokkli\.dev-sandbox\.blokk\.li$`) ||
        HostRegexp(`^blokkli-control\.dev-sandbox\.blokk\.li$`)
      service: 'blokkli-web-80'
      tls: {}

  middlewares:
    blokkli-redirectHttps:
      redirectScheme:
        scheme: https
        permanent: true

  services:
    blokkli-web-80:
      loadbalancer:
        servers:
          - url: http://ddev-blokkli-web:80
```

Then `ddev restart`. Checked 2026-10-15: the claim page (302 to `/de`),
`blokkli.…` (302 to the claim page), an unknown sandbox (nginx's 410), HTTP (301
to HTTPS), all with the wildcard certificate.

### 5. Start and check

```bash
cd ~/sandbox
ddev start
ddev exec printenv DDEV_HOSTNAME   # only dev-sandbox.blokk.li names
docker exec ddev-router ls /mnt/ddev-global-cache/traefik/certs | grep blokkli-wildcard
echo | openssl s_client -connect blokkli-control.dev-sandbox.blokk.li:443 \
  -servername x1.blokkli.dev-sandbox.blokk.li 2>/dev/null | openssl x509 -noout -subject -issuer -ext subjectAltName
```

### 6. First deploy

```bash
ddev deploy
```

Then claim a sandbox at
[https://blokkli-control.dev-sandbox.blokk.li](https://blokkli-control.dev-sandbox.blokk.li);
`/admin` asks for the password from step 3.

### 7. The router checks (12)

```bash
# No ddev.site host gets through: the router's 404
curl -skI https://127.0.0.1 -H 'Host: blokkli.ddev.site' | head -1
# X-Forwarded-Host is overwritten: the answer belongs to the real host
curl -sI https://blokkli-control.dev-sandbox.blokk.li -H 'X-Forwarded-Host: evil.blokkli.dev-sandbox.blokk.li'
```

### 8. Later

- Weekly (set up 2026-10-16): `~/bin/sandbox-weekly.sh` renews the wildcard
  certificate when it has less than 30 days left (lego `renew --days 30`),
  copies it into `.ddev/traefik/certs/`, starts the project if it doesn't run,
  and runs `ddev deploy`, whose restart hands the certificate to the router. It
  logs to `~/sandbox-cron.log`. `liip`'s crontab, under the GitHub deploy's
  lock:
  `0 4 * * 1 /usr/bin/flock /tmp/blokkli-deploy.lock /home/liip/bin/sandbox-weekly.sh`
  (Mondays 04:00, Europe/Zurich). It deletes every sandbox.
- After a reboot (2026-10-19): unattended-upgrades reboots the server at 02:00
  for a new kernel (`Automatic-Reboot-Time`), and nothing started the project
  again, so the first weekly run found it down. `@reboot` now runs
  `~/bin/sandbox-boot.sh` (waits for Docker, `ddev start`), under the same lock.
- One deploy at a time: `ddev deploy` gives up while another one runs
  (`/tmp/blokkli-deploy-running.lock`). The first GitHub deploy (2026-10-15)
  failed because a manual deploy ran at the same time: both baked into
  `db/site.sqlite`, and the seed found no bundles.
- The GitHub workflow (set up 2026-10-15):
  `.github/workflows/deploy-sandbox.yml` deploys on every push to `dev` (and by
  hand: "Run workflow"). Its secrets `SANDBOX_SSH_KEY` and `SANDBOX_KNOWN_HOSTS`
  hold a key of its own, whose entry in `liip`'s `authorized_keys` forces the
  command:
  `command="flock /tmp/blokkli-deploy.lock sh -c \"cd /home/liip/sandbox && /usr/bin/ddev deploy\"",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 … github-actions deploy blokkli/editor`.
  Every push deletes all sandboxes, premium ones included.
